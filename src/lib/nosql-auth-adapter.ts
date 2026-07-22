import { getItem, putItem, queryByPk, queryByGsi, queryByEntityType, deleteItem } from './nosql';

/**
 * Normalizes date properties and boolean flags for Better Auth objects.
 */
function formatAuthItem(item: any) {
  if (!item) return null;
  const res = { ...item };

  // Normalize emailVerified boolean
  if (res.emailVerified === 'true' || res.emailVerified === 1 || res.emailVerified === '1' || res.emailVerified === true) {
    res.emailVerified = true;
  } else if (res.emailVerified === 'false' || res.emailVerified === 0 || res.emailVerified === '0' || res.emailVerified === false) {
    res.emailVerified = false;
  }

  // Parse ISO date strings to native JS Date objects
  if (res.createdAt && typeof res.createdAt === 'string') res.createdAt = new Date(res.createdAt);
  if (res.updatedAt && typeof res.updatedAt === 'string') res.updatedAt = new Date(res.updatedAt);
  if (res.expiresAt && typeof res.expiresAt === 'string') res.expiresAt = new Date(res.expiresAt);
  if (res.accessTokenExpiresAt && typeof res.accessTokenExpiresAt === 'string') res.accessTokenExpiresAt = new Date(res.accessTokenExpiresAt);
  if (res.refreshTokenExpiresAt && typeof res.refreshTokenExpiresAt === 'string') res.refreshTokenExpiresAt = new Date(res.refreshTokenExpiresAt);

  return res;
}

/**
 * Oracle Single-Table Database Adapter for Better Auth
 */
export function nosqlAuthAdapter() {
  return (options?: any) => ({
    id: 'oracle-nosql-adapter',

    async transaction(cb: (trx: any) => Promise<any>) {
      return cb(this);
    },

    async create({ model, data }: { model: string; data: any }) {
      const id = data.id || `id_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      // Omit joined account/user objects from raw database item payload
      const { account: _acc, user: _usr, ...cleanData } = data;
      const itemData = { ...cleanData, id };

      if (model === 'user') {
        const pk = `USER#${id}`;
        const sk = 'PROFILE';
        const emailKey = data.email ? data.email.toLowerCase() : '';
        await putItem(pk, sk, 'USER', itemData, `EMAIL#${emailKey}`, 'PROFILE');
      } else if (model === 'session') {
        const pk = `USER#${data.userId}`;
        const sk = `SESSION#${id}`;
        await putItem(pk, sk, 'SESSION', itemData, `TOKEN#${data.token}`, 'SESSION');
      } else if (model === 'account') {
        const pk = `USER#${data.userId}`;
        const sk = `ACCOUNT#${data.providerId}#${data.accountId}`;
        const accountGsiKey = `ACCOUNT#${data.providerId}#${data.accountId}`;
        await putItem(pk, sk, 'ACCOUNT', itemData, accountGsiKey, 'ACCOUNT');
      } else if (model === 'verification') {
        const pk = `VERIFICATION#${data.identifier}`;
        const sk = `VERIFICATION#${id}`;
        await putItem(pk, sk, 'VERIFICATION', itemData, `VERIFICATION#${id}`, 'VERIFICATION');
      }

      return formatAuthItem(itemData);
    },

    async findOne({ model, where }: { model: string; where: Array<{ field: string; value: any }> }) {
      const fieldMap = new Map(where.map(w => [w.field, w.value]));

      if (model === 'user') {
        let userItem: any = null;
        if (fieldMap.has('id')) {
          userItem = await getItem<any>(`USER#${fieldMap.get('id')}`, 'PROFILE');
        } else if (fieldMap.has('email')) {
          const emailVal = String(fieldMap.get('email')).toLowerCase();
          const res = await queryByGsi<any>(`EMAIL#${emailVal}`);
          if (res.length > 0) userItem = res[0];
        }

        if (!userItem) {
          const all = await queryByEntityType<any>('USER');
          userItem = all.find(item =>
            where.every(w => {
              const val = item[w.field];
              if (val === undefined || val === null) return w.value === null || w.value === undefined;
              if (typeof w.value === 'string' && typeof val === 'string') return val.toLowerCase() === w.value.toLowerCase();
              return val === w.value;
            })
          );
        }

        if (!userItem) return null;

        const formattedUser = formatAuthItem(userItem);

        // Attach linked account documents for Better Auth user joins
        const pkItems = await queryByPk<any>(`USER#${userItem.id}`);
        const gsiCred = await queryByGsi<any>(`ACCOUNT#credential#${userItem.id}`);
        const gsiEmail = await queryByGsi<any>(`ACCOUNT#email#${userItem.id}`);
        const gsiGoogle = await queryByGsi<any>(`ACCOUNT#google#${userItem.id}`);

        const combinedAccounts = [...pkItems, ...gsiCred, ...gsiEmail, ...gsiGoogle].filter(i => i.providerId || i.accountId);
        const accountMap = new Map<string, any>();
        combinedAccounts.forEach(acc => accountMap.set(acc.id || `${acc.providerId}_${acc.accountId}`, acc));
        let accountsList = Array.from(accountMap.values());

        if (accountsList.length === 0) {
          const allAccountDocs = await queryByEntityType<any>('ACCOUNT');
          accountsList = allAccountDocs.filter(a => a.userId === userItem.id);
        }

        formattedUser.account = accountsList.map(formatAuthItem);
        return formattedUser;
      } else if (model === 'session') {
        let sessionItem: any = null;
        if (fieldMap.has('token')) {
          const res = await queryByGsi<any>(`TOKEN#${fieldMap.get('token')}`);
          if (res.length > 0) sessionItem = res[0];
        }
        if (!sessionItem && fieldMap.has('userId')) {
          const userItems = await queryByPk<any>(`USER#${fieldMap.get('userId')}`);
          const sessions = userItems.filter(i => i.token && i.userId);
          if (sessions.length > 0) sessionItem = sessions[0];
        }
        if (!sessionItem) {
          const all = await queryByEntityType<any>('SESSION');
          sessionItem = all.find(item =>
            where.every(w => {
              const val = item[w.field];
              if (val === undefined || val === null) return w.value === null || w.value === undefined;
              if (typeof w.value === 'string' && typeof val === 'string') return val.toLowerCase() === w.value.toLowerCase();
              return val === w.value;
            })
          );
        }

        if (!sessionItem) return null;

        const formattedSession = formatAuthItem(sessionItem);

        // Attach linked user profile for Better Auth session joins
        const userProfile = await getItem<any>(`USER#${sessionItem.userId}`, 'PROFILE');
        if (userProfile) {
          formattedSession.user = formatAuthItem(userProfile);
        }

        return formattedSession;
      } else if (model === 'account') {
        if (fieldMap.has('id')) {
          const res = await queryByGsi<any>(`ACCOUNT#${fieldMap.get('id')}`);
          if (res.length > 0) return formatAuthItem(res[0]);
        }
        if (fieldMap.has('providerId') && fieldMap.has('accountId')) {
          const providerId = fieldMap.get('providerId');
          const accountId = fieldMap.get('accountId');
          const res = await queryByGsi<any>(`ACCOUNT#${providerId}#${accountId}`);
          if (res.length > 0) return formatAuthItem(res[0]);
        }
        if (fieldMap.has('userId')) {
          const userId = fieldMap.get('userId');
          const reqProvider = fieldMap.get('providerId') || 'credential';

          let res = await queryByGsi<any>(`ACCOUNT#${reqProvider}#${userId}`);
          if (res.length === 0 && (reqProvider === 'credential' || reqProvider === 'email')) {
            const altProvider = reqProvider === 'credential' ? 'email' : 'credential';
            res = await queryByGsi<any>(`ACCOUNT#${altProvider}#${userId}`);
          }
          if (res.length > 0) return formatAuthItem(res[0]);

          const userItems = await queryByPk<any>(`USER#${userId}`);
          const accountItems = userItems.filter(i => i.providerId || i.accountId);
          if (accountItems.length > 0) return formatAuthItem(accountItems[0]);
        }
      } else if (model === 'verification') {
        if (fieldMap.has('identifier')) {
          const res = await queryByPk<any>(`VERIFICATION#${fieldMap.get('identifier')}`);
          if (res.length > 0) return formatAuthItem(res[0]);
        }
        if (fieldMap.has('id')) {
          const res = await queryByGsi<any>(`VERIFICATION#${fieldMap.get('id')}`);
          if (res.length > 0) return formatAuthItem(res[0]);
        }
      }

      // Fallback entity scanning
      const all = await queryByEntityType<any>(model.toUpperCase());
      const found = all.find(item =>
        where.every(w => {
          const val = item[w.field];
          if (val === undefined || val === null) return w.value === null || w.value === undefined;
          if (typeof w.value === 'string' && typeof val === 'string') {
            if (w.field === 'providerId' && (w.value === 'credential' || w.value === 'email')) {
              return val === 'credential' || val === 'email';
            }
            return val.toLowerCase() === w.value.toLowerCase();
          }
          return val === w.value;
        })
      );
      return formatAuthItem(found) || null;
    },

    async findMany({ model, where }: { model: string; where?: Array<{ field: string; value: any }> }) {
      if (model === 'account') {
        const userIdWhere = where?.find(w => w.field === 'userId');
        if (userIdWhere) {
          const userId = userIdWhere.value;
          const pkItems = await queryByPk<any>(`USER#${userId}`);
          const gsiCred = await queryByGsi<any>(`ACCOUNT#credential#${userId}`);
          const gsiEmail = await queryByGsi<any>(`ACCOUNT#email#${userId}`);
          const gsiGoogle = await queryByGsi<any>(`ACCOUNT#google#${userId}`);

          const combined = [...pkItems, ...gsiCred, ...gsiEmail, ...gsiGoogle].filter(i => i.providerId || i.accountId);
          const accountMap = new Map<string, any>();
          combined.forEach(acc => accountMap.set(acc.id || `${acc.providerId}_${acc.accountId}`, acc));
          let accountsList = Array.from(accountMap.values());

          if (accountsList.length === 0) {
            const allAccountDocs = await queryByEntityType<any>('ACCOUNT');
            accountsList = allAccountDocs.filter(a => a.userId === userId);
          }

          const filtered = accountsList.filter(item =>
            !where || where.every(w => {
              if (w.field === 'userId') return item.userId === userId;
              if (w.field === 'providerId' && (w.value === 'credential' || w.value === 'email')) {
                return item.providerId === 'credential' || item.providerId === 'email';
              }
              return item[w.field] === w.value;
            })
          );
          return filtered.map(formatAuthItem);
        }
      }

      const all = await queryByEntityType<any>(model.toUpperCase());
      const filtered = !where || where.length === 0
        ? all
        : all.filter(item => where.every(w => {
            if (w.field === 'providerId' && (w.value === 'credential' || w.value === 'email')) {
              return item.providerId === 'credential' || item.providerId === 'email';
            }
            return item[w.field] === w.value;
          }));

      return filtered.map(formatAuthItem);
    },

    async update({ model, where, update }: { model: string; where: Array<{ field: string; value: any }>; update: any }) {
      const existing = await this.findOne({ model, where });
      if (!existing) return null;

      const { account: _acc, user: _usr, ...cleanExisting } = existing;
      const updated = { ...cleanExisting, ...update, updatedAt: new Date().toISOString() };
      await this.create({ model, data: updated });
      return formatAuthItem(updated);
    },

    async delete({ model, where }: { model: string; where: Array<{ field: string; value: any }> }) {
      const existing = await this.findOne({ model, where });
      if (!existing) return;

      if (model === 'user') {
        await deleteItem(`USER#${existing.id}`, 'PROFILE');
      } else if (model === 'session') {
        await deleteItem(`USER#${existing.userId}`, `SESSION#${existing.id}`);
      } else if (model === 'account') {
        await deleteItem(`USER#${existing.userId}`, `ACCOUNT#${existing.providerId}#${existing.accountId}`);
      } else if (model === 'verification') {
        await deleteItem(`VERIFICATION#${existing.identifier}`, `VERIFICATION#${existing.id}`);
      }
    },

    async deleteMany({ model, where }: { model: string; where?: Array<{ field: string; value: any }> }) {
      const items = await this.findMany({ model, where });
      for (const item of items) {
        await this.delete({ model, where: [{ field: 'id', value: item.id }] });
      }
    },
  });
}
