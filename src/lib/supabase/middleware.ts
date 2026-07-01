import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isBlockedBot, isProbePath, SECURITY_HEADERS } from "@/lib/security";

function withSecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    if (!response.headers.has(key)) response.headers.set(key, value);
  }
  return response;
}

export async function updateSession(request: NextRequest) {
  if (isProbePath(request.nextUrl.pathname)) {
    return withSecurityHeaders(new NextResponse("Not Found", { status: 404 }));
  }

  const ua = request.headers.get("user-agent");
  if (isBlockedBot(ua)) {
    return withSecurityHeaders(new NextResponse("Forbidden", { status: 403 }));
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[middleware] Missing Supabase environment variables");
    return withSecurityHeaders(supabaseResponse);
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  let user = null;
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    user = session?.user ?? null;
  } catch (err) {
    console.error("[middleware] Session refresh failed:", err);
    const pathname = request.nextUrl.pathname;
    const isPublicRoute =
      pathname === "/" ||
      pathname === "/login" ||
      pathname.startsWith("/auth") ||
      pathname.startsWith("/pricing");
    if (!isPublicRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return withSecurityHeaders(NextResponse.redirect(url));
    }
    return withSecurityHeaders(supabaseResponse);
  }

  const pathname = request.nextUrl.pathname;

  const isPublicRoute =
    pathname === "/" ||
    pathname === "/login" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/pricing");

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const next = pathname + request.nextUrl.search;
    if (next && next !== "/login") url.searchParams.set("next", next);
    return withSecurityHeaders(NextResponse.redirect(url));
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return withSecurityHeaders(NextResponse.redirect(url));
  }

  if (user && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return withSecurityHeaders(NextResponse.redirect(url));
  }

  return withSecurityHeaders(supabaseResponse);
}
