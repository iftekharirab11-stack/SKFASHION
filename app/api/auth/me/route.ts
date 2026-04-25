import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.split(" ")[1]

    if (!token) {
      return NextResponse.json({ error: "Access token required" }, { status: 401 })
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    const supabase = await createClient()

    // Get user from our users table
    const { data: user, error } = await supabase
      .from("users")
      .select("id, email, full_name, phone, role, is_verified, created_at, avatar_url")
      .eq("id", decoded.id)
      .single()

    if (error || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone,
        role: user.role,
        isVerified: user.is_verified,
        createdAt: user.created_at,
        avatarUrl: user.avatar_url,
      },
    })
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }
    console.error("Get user error:", error)
    return NextResponse.json(
      { error: "Failed to fetch user", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
