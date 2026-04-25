import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data: users, error } = await supabase
      .from("users")
      .select("id, email, full_name, phone, role, is_verified, created_at")
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ users: users || [] })
  } catch (error) {
    console.error("Get users error:", error)
    return NextResponse.json(
      { error: "Failed to fetch users", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, role } = await request.json()

    if (!id || !role) {
      return NextResponse.json({ error: "ID and role required" }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { error } = await supabase
      .from("users")
      .update({ role })
      .eq("id", id)

    if (error) throw error

    return NextResponse.json({ message: "User role updated" })
  } catch (error) {
    console.error("Update user error:", error)
    return NextResponse.json(
      { error: "Failed to update user", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
