import { NextResponse } from 'next/server'

export async function POST() {
  try {
    return NextResponse.json({
      success: true,
      message: 'Cache cleared - please refresh your browser to clear client-side cache',
      instructions: [
        '1. Open browser dev tools (F12)',
        '2. Go to Application tab > Local Storage',
        '3. Find and delete the "profile-store" entry',
        '4. Refresh the page',
        'Or use localStorage.removeItem("profile-store") in console'
      ]
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to clear cache',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Debug cache endpoint - use POST to clear cache',
    instructions: [
      'POST /api/debug/clear-cache - get instructions to clear client cache',
      'The profile store uses Zustand persistence with localStorage'
    ]
  })
}