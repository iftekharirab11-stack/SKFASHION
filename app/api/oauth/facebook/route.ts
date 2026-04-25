import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"

export async function POST(request: NextRequest) {
  try {
    const { access_token } = await request.json()

    if (!access_token) {
      return NextResponse.json({ error: "Access token required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Get user from Supabase using access token
    const { data: userData, error: userError } = await supabase.auth.getUser(access_token)

    if (userError || !userData.user) {
      return NextResponse.json({ error: "Invalid OAuth token" }, { status: 401 })
    }

    const supabaseUser = userData.user
    const email = supabaseUser.email!
    const fullName =
      supabaseUser.user_metadata?.full_name ||
      supabaseUser.user_metadata?.name ||
      email.split("@")[0]
    const avatarUrl = supabaseUser.user_metadata?.avatar_url

    // Check if user exists in our users table
    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single()

    let user

    if (existingUser) {
      user = existingUser
      // Update avatar if available and not set
      if (avatarUrl && !user.avatar_url) {
        await supabase
          .from("users")
          .update({ avatar_url: avatarUrl })
          .eq("id", user.id)
      }
    } else {
      // Create new user from OAuth
      const { data: newUser, error: insertError } = await supabase
        .from("users")
        .insert([
          {
            email,
            password: null,
            full_name: fullName,
            phone: null,
            role: "customer",
            is_verified: true,
            avatar_url: avatarUrl,
            provider: "facebook",
            provider_id: supabaseUser.id,
          },
        ])
        .select()
        .single()

      if (insertError) {
        console.error("Error creating OAuth user:", insertError)
        return NextResponse.json({ error: "Failed to create user account" }, { status: 500 })
      }

      user = newUser
    }

    // Generate app JWT
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    )

    // Build redirect URL
    const frontendUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    const redirectUrl = `${frontendUrl}/auth/auth-callback.html?token=${token}&user=${encodeURIComponent(
      JSON.stringify({
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        avatarUrl: user.avatar_url,
      })
    )}`

    return NextResponse.json({ success: true, redirect_url: redirectUrl })
  } catch (error) {
    console.error("OAuth callback error:", error)
    return NextResponse.json(
      { error: "OAuth authentication failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
