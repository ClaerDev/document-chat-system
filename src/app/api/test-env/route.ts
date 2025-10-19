import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const openaiKey = process.env.OPENAI_API_KEY

  return Response.json({
    hasOpenAIKey: !!openaiKey,
    keyPrefix: openaiKey?.substring(0, 10) || 'not set',
    keySuffix: openaiKey?.substring(openaiKey.length - 4) || 'not set',
    nodeEnv: process.env.NODE_ENV
  })
}
