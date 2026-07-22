import { nosqlAuthAdapter } from '../src/lib/nosql-auth-adapter';

async function testAuthAdapterFlow() {
  console.log('🧪 Testing NosqlAuthAdapter with Better Auth simulation...');
  const adapter = nosqlAuthAdapter()();

  // 1. Create a dummy user
  const userId = `test_usr_${Date.now()}`;
  const user = await adapter.create({
    model: 'user',
    data: {
      id: userId,
      email: `test_${Date.now()}@example.com`,
      name: 'Test User',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  });
  console.log('✅ User created:', user);

  // 2. Find user by email
  const foundUserByEmail = await adapter.findOne({
    model: 'user',
    where: [{ field: 'email', value: user.email }]
  });
  console.log('✅ Found user by email:', foundUserByEmail?.id === userId ? 'MATCH' : 'FAILED', foundUserByEmail);

  // 3. Create a session
  const token = `test_token_${Date.now()}`;
  const session = await adapter.create({
    model: 'session',
    data: {
      id: `sess_${Date.now()}`,
      userId: userId,
      token: token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  });
  console.log('✅ Session created:', session);

  // 4. Find session by token
  const foundSession = await adapter.findOne({
    model: 'session',
    where: [{ field: 'token', value: token }]
  });
  console.log('✅ Found session by token:', foundSession?.userId === userId ? 'MATCH' : 'FAILED', foundSession);

  // 5. Find user by id (as Better Auth does after session validation)
  const foundUserById = await adapter.findOne({
    model: 'user',
    where: [{ field: 'id', value: userId }]
  });
  console.log('✅ Found user by id:', foundUserById?.id === userId ? 'MATCH' : 'FAILED', foundUserById);

  // Clean up test items
  if (foundSession) {
    await adapter.delete({
      model: 'session',
      where: [{ field: 'id', value: foundSession.id }]
    });
  }
  if (foundUserById) {
    await adapter.delete({
      model: 'user',
      where: [{ field: 'id', value: foundUserById.id }]
    });
  }
  console.log('🧹 Cleaned up test data.');
}

testAuthAdapterFlow();
