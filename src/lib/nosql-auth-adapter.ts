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
        // After the migration patch, GSI keys use ACCOUNT#<providerId>#<userId> format
        const pkItems = await queryByPk<any>(`USER#${userItem.id}`);
        const gsiCred   = await queryByGsi<any>(`ACCOUNT#credential#${userItem.id}`);
        const gsiEmail  = await queryByGsi<any>(`ACCOUNT#email#${userItem.id}`);
        const gsiGoogle = await queryByGsi<any>(`ACCOUNT#google#${userItem.id}`);

        const combinedAccounts = [...pkItems, ...gsiCred, ...gsiEmail, ...gsiGoogle]
          .filter(i => i.providerId || i.accountId);
        const accountMap = new Map<string, any>();
        combinedAccounts.forEach(acc => accountMap.set(
          acc.id || `${acc.providerId}_${acc.accountId}`, acc
        ));
        let accountsList = Array.from(accountMap.values());

        if (accountsList.length === 0) {
          const allAccountDocs = await queryByEntityType<any>('ACCOUNT');
          accountsList = allAccountDocs.filter((a: any) => a.userId === userItem.id);
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
          const accountId  = fieldMap.get('accountId');
          // Primary: look up by (providerId, accountId) — the direct key
          const res1 = await queryByGsi<any>(`ACCOUNT#${providerId}#${accountId}`);
          if (res1.length > 0) return formatAuthItem(res1[0]);
        }
        if (fieldMap.has('userId')) {
          const userId      = fieldMap.get('userId');
          const reqProvider = fieldMap.get('providerId') || 'credential';

          // Try canonical GSI: ACCOUNT#<provider>#<userId>  (post-patch format)
          let res = await queryByGsi<any>(`ACCOUNT#${reqProvider}#${userId}`);

          // credential ↔ email alias (migrated users use 'email' provider)
          if (res.length === 0 && (reqProvider === 'credential' || reqProvider === 'email')) {
            const alt = reqProvider === 'credential' ? 'email' : 'credential';
            res = await queryByGsi<any>(`ACCOUNT#${alt}#${userId}`);
          }
          if (res.length > 0) return formatAuthItem(res[0]);

          // Fallback: scan all rows under USER#<userId>
          const userItems   = await queryByPk<any>(`USER#${userId}`);
          const accountItems = userItems.filter((i: any) => i.providerId || i.accountId);
          if (accountItems.length > 0) return formatAuthItem(accountItems[0]);
        }
      } else if (model === 'verification') {
        if (fieldMap.has('id')) {
          const res = await queryByGsi<any>(`VERIFICATION#${fieldMap.get('id')}`);
          if (res.length > 0) return formatAuthItem(res[0]);
        }
        if (fieldMap.has('identifier')) {
          const res = await queryByPk<any>(`VERIFICATION#${fieldMap.get('identifier')}`);
          const match = res.find(item =>
            where.every(w => {
              const val = item[w.field];
              if (val === undefined || val === null) return w.value === null || w.value === undefined;
              return String(val) === String(w.value);
            })
          );
          if (match) return formatAuthItem(match);
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

    async findMany({
      model,
      where,
      limit,
      offset,
      sortBy,
    }: {
      model: string;
      where?: Array<{ field: string; value: any }>;
      limit?: number;
      offset?: number;
      sortBy?: { field: string; direction: 'asc' | 'desc' };
    }) {
      let results: any[] = [];

      if (model === 'account') {
        const userIdWhere = where?.find(w => w.field === 'userId');
        if (userIdWhere) {
          const userId = userIdWhere.value;
          // After patch: GSI keys are ACCOUNT#<provider>#<userId>
          const pkItems   = await queryByPk<any>(`USER#${userId}`);
          const gsiCred   = await queryByGsi<any>(`ACCOUNT#credential#${userId}`);
          const gsiEmail  = await queryByGsi<any>(`ACCOUNT#email#${userId}`);
          const gsiGoogle = await queryByGsi<any>(`ACCOUNT#google#${userId}`);

          const combined = [...pkItems, ...gsiCred, ...gsiEmail, ...gsiGoogle]
            .filter((i: any) => i.providerId || i.accountId);
          const accountMap = new Map<string, any>();
          combined.forEach((acc: any) => accountMap.set(
            acc.id || `${acc.providerId}_${acc.accountId}`, acc
          ));
          let accountsList = Array.from(accountMap.values());

          if (accountsList.length === 0) {
            const allAccountDocs = await queryByEntityType<any>('ACCOUNT');
            accountsList = allAccountDocs.filter((a: any) => a.userId === userId);
          }

          results = accountsList.filter((item: any) =>
            !where || where.every(w => {
              if (w.field === 'userId') return item.userId === userId;
              // credential and email are equivalent for migrated users
              if (w.field === 'providerId' && (w.value === 'credential' || w.value === 'email')) {
                return item.providerId === 'credential' || item.providerId === 'email';
              }
              return item[w.field] === w.value;
            })
          );
        } else {
          const all = await queryByEntityType<any>('ACCOUNT');
          results = !where || where.length === 0
            ? all
            : all.filter(item => where.every(w => {
                if (w.field === 'providerId' && (w.value === 'credential' || w.value === 'email')) {
                  return item.providerId === 'credential' || item.providerId === 'email';
                }
                return item[w.field] === w.value;
              }));
        }
      } else if (model === 'verification') {
        const identifierWhere = where?.find(w => w.field === 'identifier');
        const idWhere = where?.find(w => w.field === 'id');
        let records: any[] = [];
        if (identifierWhere) {
          records = await queryByPk<any>(`VERIFICATION#${identifierWhere.value}`);
        } else if (idWhere) {
          records = await queryByGsi<any>(`VERIFICATION#${idWhere.value}`);
        } else {
          records = await queryByEntityType<any>('VERIFICATION');
        }

        results = !where || where.length === 0
          ? records
          : records.filter(item => where.every(w => {
              const val = item[w.field];
              if (val === undefined || val === null) return w.value === null || w.value === undefined;
              return String(val) === String(w.value);
            }));
      } else if (model === 'session') {
        const userIdWhere = where?.find(w => w.field === 'userId');
        let records: any[] = [];
        if (userIdWhere) {
          const userItems = await queryByPk<any>(`USER#${userIdWhere.value}`);
          records = userItems.filter(i => i.token && i.userId);
        }
        if (records.length === 0) {
          records = await queryByEntityType<any>('SESSION');
        }
        results = !where || where.length === 0
          ? records
          : records.filter(item => where.every(w => {
              const val = item[w.field];
              if (val === undefined || val === null) return w.value === null || w.value === undefined;
              return String(val) === String(w.value);
            }));
      } else {
        const all = await queryByEntityType<any>(model.toUpperCase());
        results = !where || where.length === 0
          ? all
          : all.filter(item => where.every(w => {
              const val = item[w.field];
              if (val === undefined || val === null) return w.value === null || w.value === undefined;
              return item[w.field] === w.value;
            }));
      }

      if (sortBy) {
        results.sort((a: any, b: any) => {
          const valA = a[sortBy.field];
          const valB = b[sortBy.field];
          const timeA = valA instanceof Date ? valA.getTime() : new Date(valA).getTime() || valA;
          const timeB = valB instanceof Date ? valB.getTime() : new Date(valB).getTime() || valB;
          if (timeA < timeB) return sortBy.direction === 'desc' ? 1 : -1;
          if (timeA > timeB) return sortBy.direction === 'desc' ? -1 : 1;
          return 0;
        });
      }

      if (typeof offset === 'number' && offset > 0) {
        results = results.slice(offset);
      }

      if (typeof limit === 'number' && limit >= 0) {
        results = results.slice(0, limit);
      }

      return results.map(formatAuthItem);
    },

    async update({ model, where, update }: { model: string; where: Array<{ field: string; value: any }>; update: any }) {
      const existing = await this.findOne({ model, where });
      if (!existing) return null;

      const { account: _acc, user: _usr, ...cleanExisting } = existing;
      const updated = { ...cleanExisting, ...update, updatedAt: new Date().toISOString() };
      await this.create({ model, data: updated });
      return formatAuthItem(updated);
    },

    async updateMany({ model, where, update }: { model: string; where?: Array<{ field: string; value: any }>; update: any }) {
      const items = await this.findMany({ model, where });
      for (const item of items) {
        await this.update({ model, where: [{ field: 'id', value: item.id }], update });
      }
      return items.length;
    },

    async delete({ model, where }: { model: string; where: Array<{ field: string; value: any }> }) {
      const existing = await this.findOne({ model, where });
      if (!existing) return;

      if (model === 'user') {
        await deleteItem(`USER#${existing.id}`, 'PROFILE');
      } else if (model === 'session') {
        await deleteItem(`USER#${existing.userId}`, `SESSION#${existing.id}`);
      } else if (model === 'account') {
        const accId = existing.accountId || existing.userId;
        await deleteItem(`USER#${existing.userId}`, `ACCOUNT#${existing.providerId}#${accId}`);
      } else if (model === 'verification') {
        await deleteItem(`VERIFICATION#${existing.identifier}`, `VERIFICATION#${existing.id}`);
      }
    },

    async deleteMany({ model, where }: { model: string; where?: Array<{ field: string; value: any }> }) {
      const items = await this.findMany({ model, where });
      for (const item of items) {
        if (model === 'verification') {
          await deleteItem(`VERIFICATION#${item.identifier}`, `VERIFICATION#${item.id}`);
        } else if (model === 'user') {
          await deleteItem(`USER#${item.id}`, 'PROFILE');
        } else if (model === 'session') {
          await deleteItem(`USER#${item.userId}`, `SESSION#${item.id}`);
        } else if (model === 'account') {
          const accId = item.accountId || item.userId;
          await deleteItem(`USER#${item.userId}`, `ACCOUNT#${item.providerId}#${accId}`);
        } else {
          await this.delete({ model, where: [{ field: 'id', value: item.id }] });
        }
      }
      return items.length;
    },

    async consumeOne({ model, where }: { model: string; where: Array<{ field: string; value: any }> }) {
      const item = await this.findOne({ model, where });
      if (!item) return null;

      if (model === 'verification') {
        await deleteItem(`VERIFICATION#${item.identifier}`, `VERIFICATION#${item.id}`);
      } else if (model === 'user') {
        await deleteItem(`USER#${item.id}`, 'PROFILE');
      } else if (model === 'session') {
        await deleteItem(`USER#${item.userId}`, `SESSION#${item.id}`);
      } else if (model === 'account') {
        const accId = item.accountId || item.userId;
        await deleteItem(`USER#${item.userId}`, `ACCOUNT#${item.providerId}#${accId}`);
      } else {
        await this.delete({ model, where: [{ field: 'id', value: item.id }] });
      }

      return item;
    },

    async count({ model, where }: { model: string; where?: Array<{ field: string; value: any }> }) {
      const items = await this.findMany({ model, where });
      return items.length;
    },

    async incrementOne({
      model,
      where,
      increment,
      set,
    }: {
      model: string;
      where: Array<{ field: string; value: any }>;
      increment: Record<string, number>;
      set?: Record<string, any>;
    }) {
      const item = await this.findOne({ model, where });
      if (!item) return null;

      const updated = { ...item };
      for (const [field, delta] of Object.entries(increment)) {
        updated[field] = (typeof updated[field] === 'number' ? updated[field] : 0) + delta;
      }
      if (set) {
        Object.assign(updated, set);
      }
      return await this.update({
        model,
        where: [{ field: 'id', value: item.id }],
        update: updated,
      });
    },
  });
}
