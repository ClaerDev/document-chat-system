import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    console.log('Auth Test: Starting request');
    console.log('Auth Test: Headers:', Object.fromEntries(request.headers.entries()));
    
    const { userId, sessionId, orgId } = await auth();
    console.log('Auth Test: auth() result:', { userId, sessionId, orgId });
    
    let userInfo = null;
    if (userId) {
      try {
        const user = await currentUser();
        userInfo = {
          id: user?.id,
          firstName: user?.firstName,
          lastName: user?.lastName,
          emailAddresses: user?.emailAddresses?.map(e => e.emailAddress),
        };
      } catch (error) {
        console.error('Auth Test: Error getting current user:', error);
      }
    }
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      auth: {
        userId,
        sessionId,
        orgId,
        hasUser: !!userId,
      },
      user: userInfo,
      headers: {
        authorization: request.headers.get('authorization'),
        cookie: request.headers.get('cookie') ? 'Present' : 'Missing',
        userAgent: request.headers.get('user-agent'),
      },
    });
  } catch (error) {
    console.error('Auth Test: Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}