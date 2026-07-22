import { nosqlAuthAdapter } from '../src/lib/nosql-auth-adapter';

async function testGoogleOAuthAdapter() {
  console.log('🧪 Testing Google OAuth database adapter flow...');
  const adapter = nosqlAuthAdapter()();

  const googleEmail = 'test_google_user@example.com';
  const googleSub = '109876543210987654321';

  // Step 1: Check if account exists by (providerId='google', accountId=googleSub)
  console.log('1️⃣ Looking for account providerId=google, accountId=', googleSub);
  let account = await adapter.findOne({
    model: 'account',
    where: [
      { field: 'providerId', value: 'google' },
      { field: 'accountId', value: googleSub }
    ]
  });
  console.log('  -> Account search result:', account);

  // Step 2: Check if user exists by email
  console.log('2️⃣ Looking for user by email:', googleEmail);
  let user = await adapter.findOne({
    model: 'user',
    where: [{ field: 'email', value: googleEmail }]
  });
  console.log('  -> User search result:', user);

  // Step 3: Create user if not found
  if (!user) {
    console.log('3️⃣ Creating new user for Google OAuth...');
    user = await adapter.create({
      model: 'user',
      data: {
        id: `usr_g_${Date.now()}`,
        email: googleEmail,
        name: 'Google User',
        firstName: 'Google',
        lastName: 'User',
        emailVerified: true,
        image: 'https://lh3.googleusercontent.com/a/test',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    });
    console.log('  -> Created User:', user);
  }

  // Step 4: Create account link if not found
  if (!account && user) {
    console.log('4️⃣ Linking Google account to user...');
    account = await adapter.create({
      model: 'account',
      data: {
        id: `acc_g_${Date.now()}`,
        userId: user.id,
        providerId: 'google',
        accountId: googleSub,
        scope: 'email profile openid',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    });
    console.log('  -> Created Account:', account);
  }

  // Step 5: Create session
  console.log('5️⃣ Creating session for Google user...');
  const token = `g_session_token_${Date.now()}`;
  const session = await adapter.create({
    model: 'session',
    data: {
      id: `sess_g_${Date.now()}`,
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  });
  console.log('  -> Created Session:', session);

  // Step 6: Verify session lookup by token
  console.log('6️⃣ Verification: Finding session by token...');
  const verifiedSession = await adapter.findOne({
    model: 'session',
    where: [{ field: 'token', value: token }]
  });
  console.log('  -> Verified session:', verifiedSession);

  // Clean up test items
  if (session) await adapter.delete({ model: 'session', where: [{ field: 'id', value: session.id }] });
  if (account) await adapter.delete({ model: 'account', where: [{ field: 'id', value: account.id }] });
  if (user) await adapter.delete({ model: 'user', where: [{ field: 'id', value: user.id }] });
  console.log('🧹 Cleanup complete.');
}

testGoogleOAuthAdapter().catch(console.error);
