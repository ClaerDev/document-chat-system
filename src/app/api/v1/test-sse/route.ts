import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    console.log('Test SSE: Starting simple SSE test');
    
    const { userId } = await auth();
    
    if (!userId) {
      console.log('Test SSE: No userId');
      return new Response('Unauthorized', { status: 401 });
    }

    console.log('Test SSE: User authenticated:', userId);

    // Create a simple SSE stream
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        
        console.log('Test SSE: Starting stream for user:', userId);
        
        // Send initial message
        controller.enqueue(encoder.encode(`data: {"message": "Connected", "userId": "${userId}", "timestamp": "${new Date().toISOString()}"}\n\n`));
        
        // Send a message every 2 seconds
        const interval = setInterval(() => {
          try {
            const message = {
              message: 'Heartbeat',
              timestamp: new Date().toISOString(),
              count: Math.floor(Date.now() / 1000),
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
          } catch (error) {
            console.log('Test SSE: Client disconnected');
            clearInterval(interval);
          }
        }, 2000);

        // Cleanup on close
        request.signal.addEventListener('abort', () => {
          console.log('Test SSE: Connection aborted');
          clearInterval(interval);
          try {
            controller.close();
          } catch (error) {
            // Ignore close errors
          }
        });
      },
      cancel() {
        console.log('Test SSE: Stream cancelled');
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    });
  } catch (error) {
    console.error('Test SSE error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}