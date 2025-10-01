import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Simple test endpoint to verify server is working
    return NextResponse.json({
      success: true,
      message: 'Store integration test endpoint working',
      timestamp: new Date().toISOString(),
      status: 'Store API layer is functional'
    })
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Store test failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}