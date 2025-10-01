import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// Store active connections
const connections = new Map<string, ReadableStreamDefaultController>();

// Cleanup inactive connections every 30 seconds
setInterval(() => {
  for (const [userId, controller] of connections.entries()) {
    try {
      // Try to write a ping message to test if connection is alive
      controller.enqueue(new TextEncoder().encode('event: ping\ndata: {}\n\n'));
    } catch (error) {
      // Connection is dead, remove it
      connections.delete(userId);
      try {
        controller.close();
      } catch (closeError) {
        // Ignore close errors
      }
    }
  }
}, 30000);

// Handle HEAD requests for connection testing
export async function HEAD(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    return new Response(null, { 
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      }
    });
  } catch (error) {
    return new Response('Internal server error', { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Since EventSource doesn't support custom headers, we rely on cookie-based auth
    const { userId } = await auth();
    
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Get user's organization (will sync user if not exists)
    const user = await getCurrentUser();

    if (!user) {
      return new Response('User not found', { status: 404 });
    }

    // Create readable stream for SSE
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        
        // Store controller for this connection
        connections.set(userId, controller);

        // Send initial connection message
        const welcomeMessage = {
          type: 'connection',
          message: 'Connected to notification stream',
          timestamp: new Date().toISOString(),
        };

        try {
          controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify(welcomeMessage)}\n\n`));
        } catch (error) {
          console.error('Error sending welcome message:', error);
        }

        // Send periodic heartbeat
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode('event: heartbeat\ndata: {}\n\n'));
          } catch (error) {
            clearInterval(heartbeat);
            connections.delete(userId);
          }
        }, 30000);

        // Cleanup on close
        request.signal.addEventListener('abort', () => {
          clearInterval(heartbeat);
          connections.delete(userId);
          try {
            controller.close();
          } catch (error) {
            // Ignore close errors
          }
        });
      },
      cancel() {
        connections.delete(userId);
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
    console.error('SSE stream error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

// Function to send notification to specific user
export function sendNotificationToUser(userId: string, notification: any) {
  const controller = connections.get(userId);
  if (controller) {
    try {
      const encoder = new TextEncoder();
      const data = {
        type: 'notification',
        notification,
        timestamp: new Date().toISOString(),
      };
      
      controller.enqueue(encoder.encode(`event: notification\ndata: ${JSON.stringify(data)}\n\n`));
      return true;
    } catch (error) {
      console.error('Error sending notification to user:', error);
      connections.delete(userId);
      return false;
    }
  }
  return false;
}

// Function to send notification to all users in organization
export async function sendNotificationToOrganization(organizationId: string, notification: any) {
  try {
    // Get all users in the organization
    const users = await db.user.findMany({
      where: { organizationId },
      select: { clerkId: true },
    });

    let sentCount = 0;
    for (const user of users) {
      if (sendNotificationToUser(user.clerkId, notification)) {
        sentCount++;
      }
    }

    return sentCount;
  } catch (error) {
    console.error('Error sending notification to organization:', error);
    return 0;
  }
}

// Function to broadcast system-wide notifications
export function broadcastSystemNotification(notification: any) {
  let sentCount = 0;
  
  for (const [userId, controller] of connections.entries()) {
    try {
      const encoder = new TextEncoder();
      const data = {
        type: 'system',
        notification,
        timestamp: new Date().toISOString(),
      };
      
      controller.enqueue(encoder.encode(`event: system\ndata: ${JSON.stringify(data)}\n\n`));
      sentCount++;
    } catch (error) {
      console.error('Error broadcasting system notification:', error);
      connections.delete(userId);
    }
  }
  
  return sentCount;
}

// Export connection management for external use
export { connections };