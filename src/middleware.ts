import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  // Skip auth in development if this is a local host request
  if (req.nextUrl.hostname === 'localhost' || req.nextUrl.hostname === '127.0.0.1') {
    return NextResponse.next();
  }

  const basic = req.headers.get('authorization');
  if (!basic) return new NextResponse('Auth required', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Admin"' } });
  const [u, p] = Buffer.from(basic.split(' ')[1] || '', 'base64').toString().split(':');
  if (u !== process.env.BASIC_AUTH_USER || p !== process.env.BASIC_AUTH_PASS) return new NextResponse('Unauthorized', { status: 401 });
  return NextResponse.next();
}
export const config = { matcher: ['/((?!health|api/public).*)'] };