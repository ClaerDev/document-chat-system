'use client'

export default function ApiError({
  error,
}: {
  error: Error & { digest?: string }
}) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">API Error</h2>
        <p className="text-muted-foreground">{error.message}</p>
      </div>
    </div>
  )
}