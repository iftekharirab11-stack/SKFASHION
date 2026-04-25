import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    // Get user profile from our users table
    const { data: profile } = await supabase
      .from("users")
      .select("*")
      .eq("id", authData.user.id)
      .single()

    // Create app JWT (for legacy compatibility)
    const token = jwt.sign(
      {
        id: authData.user.id,
        email: authData.user.email,
        role: profile?.role || "customer",
      },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    )

    return NextResponse.json({
      message: "Login successful",
      token,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        fullName: profile?.full_name || authData.user.user_metadata?.full_name,
        role: profile?.role || "customer",
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      { error: "Login failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
