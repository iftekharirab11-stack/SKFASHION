import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

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

    const { data: lowStock, error } = await supabase
      .from("products")
      .select("id, name, stock")
      .lt("stock", 10)
      .order("stock", { ascending: true })

    if (error) throw error

    return NextResponse.json({ products: lowStock || [] })
  } catch (error) {
    console.error("Low stock error:", error)
    return NextResponse.json(
      { error: "Failed to fetch low stock", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
