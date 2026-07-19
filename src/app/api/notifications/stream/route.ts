import { auth } from '@/lib/auth.server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }
  const userId = session.user.id;

  const encoder = new TextEncoder();
  let lastCheck = new Date();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial keep-alive comment
      controller.enqueue(encoder.encode(': ok\n\n'));

      const interval = setInterval(async () => {
        try {
          // Poll database for any new notifications since lastCheck
          const newNotifs = await prisma.notification.findMany({
            where: {
              recipients: { some: { userId } },
              createdAt: { gt: lastCheck },
            },
            include: {
              reads: { where: { userId } },
              actor: {
                select: {
                  id: true,
                  name: true,
                  firstName: true,
                  lastName: true,
                  avatarUrl: true,
                  image: true
                }
              }
            },
            orderBy: { createdAt: 'asc' },
          });

          if (newNotifs.length > 0) {
            const mappedNotifs = newNotifs.map(n => ({
              id: n.id,
              type: n.type,
              title: n.title,
              body: n.body,
              groupId: n.groupId || undefined,
              expenseId: n.expenseId || undefined,
              settlementId: n.settlementId || undefined,
              actorId: n.actorId || undefined,
              createdAt: n.createdAt.toISOString(),
              target: n.target,
              channels: n.channels,
              imageUrl: n.imageUrl || undefined,
              isRead: n.reads.length > 0,
              actor: n.actor ? {
                uid: n.actor.id,
                firstName: n.actor.firstName || n.actor.name.split(' ')[0] || 'User',
                lastName: n.actor.lastName || n.actor.name.split(' ').slice(1).join(' ') || '',
                avatarUrl: n.actor.avatarUrl || n.actor.image || undefined,
              } : undefined
            }));

            controller.enqueue(encoder.encode(`data: ${JSON.stringify(mappedNotifs)}\n\n`));
          }
          lastCheck = new Date();
        } catch (error) {
          console.error("SSE interval loop error:", error);
        }
      }, 5000); // Check every 5 seconds

      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
