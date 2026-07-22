import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import { headers } from 'next/headers';
import { getItem, putItem, queryByPk } from '@/lib/nosql';

export async function POST(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin permission required.' }, { status: 403 });
    }

    const { userId } = params;
    const body = await req.json();
    const { newPassword } = body;

    if (!userId || !newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    // 1. Try Better Auth admin set user password API endpoint
    try {
      if ((auth.api as any).setUserPassword) {
        await (auth.api as any).setUserPassword({
          body: { userId, newPassword },
          headers: await headers()
        });
        return NextResponse.json({ success: true, message: 'Password updated successfully' });
      }
    } catch (e) {
      console.warn('Native auth.api.setUserPassword fallback triggered:', e);
    }

    // 2. Direct password hash calculation & database update
    const user = await getItem<any>(`USER#${userId}`, 'PROFILE');
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const hashedPassword = (auth as any).options?.password?.hash
      ? await (auth as any).options.password.hash(newPassword)
      : await (auth as any).context?.password?.hash(newPassword);

    const userItems = await queryByPk<any>(`USER#${userId}`);
    const credentialAccount = userItems.find(i => i.providerId === 'credential' || i.providerId === 'email' || i.accountId);

    if (credentialAccount) {
      const updatedAccount = {
        ...credentialAccount,
        password: hashedPassword,
        updatedAt: new Date().toISOString()
      };
      await putItem(
        `USER#${userId}`,
        `ACCOUNT#${credentialAccount.providerId || 'credential'}#${credentialAccount.accountId || userId}`,
        'ACCOUNT',
        updatedAccount,
        `ACCOUNT#${credentialAccount.providerId || 'credential'}#${userId}`,
        'ACCOUNT'
      );
    } else {
      const newAccount = {
        id: `id_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId,
        providerId: 'credential',
        accountId: userId,
        password: hashedPassword,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await putItem(
        `USER#${userId}`,
        `ACCOUNT#credential#${userId}`,
        'ACCOUNT',
        newAccount,
        `ACCOUNT#credential#${userId}`,
        'ACCOUNT'
      );
    }

    return NextResponse.json({ success: true, message: 'User password reset successfully.' });
  } catch (err: any) {
    console.error('Error resetting user password by admin:', err);
    return NextResponse.json({ error: err.message || 'Failed to reset user password' }, { status: 500 });
  }
}
