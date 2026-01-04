import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Update Supabase session
  const response = await updateSession(request);

  // Check if user is authenticated for protected routes
  const { pathname } = request.nextUrl;

  // Redirect old /ncc path to dashboard
  if (pathname === "/ncc" || pathname.startsWith("/ncc/")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Protected routes that require authentication
  const protectedRoutes = ["/dashboard", "/admin"];
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  if (isProtectedRoute) {
    // Check if user has a valid session AND exists in DB
    const cookies = request.cookies.getAll();
    const hasAuthCookie = cookies.some((cookie) => 
      cookie.name.startsWith("sb-") && cookie.name.includes("auth-token")
    );

    // If no auth cookies, redirect to login
    if (!hasAuthCookie) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Verify user exists in profiles table (catches deleted accounts)
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();
      
      // If user has auth but no profile, sign them out and redirect
      if (!profile) {
        await supabase.auth.signOut();
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("redirectTo", pathname);
        loginUrl.searchParams.set("error", "account_not_found");
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  // Redirect authenticated users away from auth pages
  const authRoutes = ["/login", "/sign-up"];
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  if (isAuthRoute) {
    const cookies = request.cookies.getAll();
    const hasAuthCookie = cookies.some((cookie) => 
      cookie.name.startsWith("sb-") && cookie.name.includes("auth-token")
    );
    
    if (hasAuthCookie) {
      // Check if there's a redirectTo parameter
      const redirectTo = request.nextUrl.searchParams.get("redirectTo");
      const destination = redirectTo || "/dashboard";
      return NextResponse.redirect(new URL(destination, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|logos/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
