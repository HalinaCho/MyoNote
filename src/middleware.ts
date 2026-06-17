import { type NextRequest, NextResponse } from 'next/server'

// Auth is handled client-side (DashboardShell). Middleware is a no-op.
export function middleware(_request: NextRequest) {
  return NextResponse.next()
}

export const config = { matcher: [] }
