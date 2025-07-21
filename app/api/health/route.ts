import { NextResponse } from 'next/server';

// Simple health check endpoint for connection monitoring
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  });
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}