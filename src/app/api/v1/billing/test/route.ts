import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';

/**
 * Simple test endpoint to verify billing API authentication
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing billing API authentication...');
    
    const { userId } = await auth();
    console.log('User ID from auth():', userId);
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated',
        code: 'NO_AUTH'
      }, { status: 401 });
    }
    
    const user = await currentUser();
    console.log('User from currentUser():', user ? { id: user.id, email: user.emailAddresses[0]?.emailAddress } : null);
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found',
        code: 'NO_USER'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Authentication working correctly',
      data: {
        userId: user.id,
        email: user.emailAddresses[0]?.emailAddress,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error in test endpoint:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing billing API PATCH simulation...');
    
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated',
        code: 'NO_AUTH'
      }, { status: 401 });
    }
    
    const body = await request.json();
    console.log('Request body received:', body);
    
    return NextResponse.json({
      success: true,
      message: 'POST request processed successfully',
      receivedData: body,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in POST test endpoint:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}