/**
 * Server-Sent Events endpoint for real-time match score updates
 * Provides silent background updates without polling
 */

import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  console.log('📡 SSE connection request received')
  
  // Check authentication
  const { userId } = await auth()
  
  if (!userId) {
    console.log('❌ SSE connection rejected - no userId')
    return new Response('Unauthorized', { status: 401 })
  }

  console.log('✅ SSE connection authenticated for user:', userId)

  // Get user organization
  const user = await prisma.user.findUnique({
    where: { clerkId: userId }
  })

  if (!user) {
    console.log('❌ SSE connection rejected - user not found in database')
    return new Response('User not found', { status: 404 })
  }

  console.log('✅ SSE connection established for organization:', user.organizationId)

  // Set up Server-Sent Events
  const encoder = new TextEncoder()
  
  let isConnected = true
  
  const customReadable = new ReadableStream({
    start(controller) {
      console.log('📡 SSE ReadableStream started')
      
      // Send initial connection message
      const connectionData = `data: ${JSON.stringify({ 
        type: 'connected', 
        organizationId: user.organizationId,
        timestamp: new Date().toISOString()
      })}\n\n`
      
      controller.enqueue(encoder.encode(connectionData))
      console.log('📡 SSE connection message sent')
      
      // Store the controller for later use (you'd want to use a proper event system here)
      // For now, we'll implement a simple polling mechanism
      
      // Use a faster polling interval for more responsive updates
      // TODO: Replace with Inngest event subscription for true real-time updates
      const interval = setInterval(async () => {
        if (!isConnected) {
          console.log('🔍 SSE connection closed, stopping polling')
          clearInterval(interval)
          return
        }
        
        try {
          console.log('🔍 SSE polling for new scores...')
          
          // Check for new match scores in the last 60 seconds (broader window to catch Inngest results)
          const recentScores = await prisma.matchScore.findMany({
            where: {
              organizationId: user.organizationId,
              createdAt: {
                gte: new Date(Date.now() - 60000) // Last 60 seconds
              }
            },
            orderBy: { createdAt: 'desc' },
            take: 50 // Check more scores
          })

          console.log(`🔍 Found ${recentScores.length} recent scores for organization ${user.organizationId}`)

          if (recentScores.length > 0) {
            console.log(`📡 SSE sending ${recentScores.length} updated scores to client`)
            
            const scoreData = recentScores.map(score => ({
              opportunityId: score.opportunityId,
              score: Number(score.overallScore),
              confidence: Number(score.confidence),
              algorithmVersion: score.algorithmVersion,
              factors: score.factors,
              detailedFactors: score.detailedFactors
            }))
            
            const eventData = `data: ${JSON.stringify({ 
              type: 'scores_updated', 
              scores: scoreData,
              timestamp: new Date().toISOString()
            })}\n\n`
            
            try {
              controller.enqueue(encoder.encode(eventData))
              console.log('📡 SSE message sent to client')
            } catch (enqueueError) {
              console.error('❌ Failed to enqueue SSE message:', enqueueError)
              isConnected = false
            }
          } else {
            console.log('🔍 No recent scores found')
            
            // Send keepalive message
            try {
              const keepaliveData = `data: ${JSON.stringify({ 
                type: 'keepalive', 
                timestamp: new Date().toISOString()
              })}\n\n`
              controller.enqueue(encoder.encode(keepaliveData))
            } catch (keepaliveError) {
              console.error('❌ Failed to send keepalive:', keepaliveError)
              isConnected = false
            }
          }
        } catch (error) {
          console.error('❌ Error in SSE stream:', error)
          isConnected = false
        }
      }, 5000) // Check every 5 seconds (less aggressive to avoid issues)

      // Clean up on close
      request.signal.addEventListener('abort', () => {
        console.log('📡 SSE connection aborted')
        isConnected = false
        clearInterval(interval)
        try {
          controller.close()
        } catch (error) {
          console.log('📡 Controller already closed')
        }
      })
    }
  })

  return new Response(customReadable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  })
}