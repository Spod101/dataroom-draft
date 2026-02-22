import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(_request: NextRequest) {
  // Pass through — all auth is handled client-side via Supabase JS SDK
  return NextResponse.next();
}

export const config = {
  // Only run on pages, not static assets
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};
