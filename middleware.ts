import { createClient } from "@/lib/supabase/middleware"
import { NextRequest, NextResponse } from "next/server"

export async function middleware(request: NextRequest) {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    const response = NextResponse.json({}, { status: 200 })
    setCorsHeaders(response, request)
    return response
  }

  const { supabase, response } = createClient(request)

  // Refresh session to keep user logged in
  await supabase.auth.getUser()

  // Set CORS headers on all responses
  setCorsHeaders(response, request)

  return response
}

function setCorsHeaders(response: NextResponse, request: NextRequest) {
  const origin = request.headers.get("origin") || "*"
  const corsOrigins = process.env.NEXT_PUBLIC_ALLOWED_ORIGINS?.split(",") || [
    "http://localhost:3000",
    "https://iftekharirab11-stack.github.io",
  ]

  // Allow if origin matches or use wildcard for localhost
  const isAllowed = corsOrigins.includes(origin) || origin.includes("localhost")
  const allowedOrigin = isAllowed ? origin : corsOrigins[0]

  response.headers.set("Access-Control-Allow-Origin", allowedOrigin)
  response.headers.set("Access-Control-Allow-Credentials", "true")
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  response.headers.set(
    "Access-Control-Allow-Headers",
    "authorization, x-csrf-token, content-type, accept"
  )
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*$).*)",
  ],
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api/auth (auth routes handle their own session)
     */
    "/((?!_next/static|_next/image|favicon.ico|public|api/auth).*)",
  ],
}
