import { auth } from '@/lib/auth.server';
import { getNotificationsForUser } from '@/lib/services/notification.service';

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
      let isClosed = false;

      // Send initial keep-alive comment
      try {
        controller.enqueue(encoder.encode(': ok\n\n'));
      } catch (e) {
        return;
      }

      const cleanup = () => {
        if (isClosed) return;
        isClosed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch (e) {
          // Controller already closed
        }
      };

      const interval = setInterval(async () => {
        if (isClosed || request.signal.aborted) {
          cleanup();
          return;
        }

        try {
          const userNotifs = await getNotificationsForUser(userId, 20);
          
          if (isClosed || request.signal.aborted) {
            cleanup();
            return;
          }

          const newNotifs = userNotifs.filter(n => new Date(n.createdAt) > lastCheck);

          if (newNotifs.length > 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(newNotifs)}\n\n`));
          }
          lastCheck = new Date();
        } catch (error: any) {
          if (isClosed || request.signal.aborted || error?.code === 'ERR_INVALID_STATE') {
            cleanup();
            return;
          }
          console.error("SSE interval loop error:", error);
        }
      }, 5000); // Check every 5 seconds

      request.signal.addEventListener('abort', cleanup);
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
