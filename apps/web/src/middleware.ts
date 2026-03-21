import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PROTECTED_ROUTES = new Set(['/', '/diary', '/lists', '/notifications', '/settings']);
const AUTH_ROUTES = new Set(['/login', '/signup', '/forgot-password']);

function isPublicPrefix(pathname: string): boolean {
  return (
    pathname.startsWith('/search') ||
    pathname.startsWith('/explore') ||
    pathname.startsWith('/item/') ||
    pathname.startsWith('/user/') ||
    pathname.startsWith('/update-password')
  );
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — MUST call getUser to refresh the session cookie
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Logged-in user trying to access auth pages → redirect home
  if (user && AUTH_ROUTES.has(pathname)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Unauthenticated user trying to access protected routes → redirect to login
  if (!user && PROTECTED_ROUTES.has(pathname) && !isPublicPrefix(pathname)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
