import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admin can view all customers
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data: customers, error } = await supabase
      .from("users")
      .select("id, email, full_name, phone, role, is_verified, created_at")
      .eq("role", "customer")
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ customers: customers || [] })
  } catch (error) {
    console.error("Get customers error:", error)
    return NextResponse.json(
      { error: "Failed to fetch customers", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
