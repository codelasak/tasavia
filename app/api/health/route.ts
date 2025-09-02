// Simple health check endpoint for connection monitoring
export async function GET() {
  return Response.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
}

export async function HEAD() {
  return new Response(null, { status: 200 })
}
