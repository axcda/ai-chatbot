import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL('/api/health', new URL(request.url).origin);
  return NextResponse.redirect(url, { status: 307 });
}

export async function HEAD(request: Request) {
  const url = new URL('/api/health', new URL(request.url).origin);
  return NextResponse.redirect(url, { status: 307 });
}

