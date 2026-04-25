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

    const [
      totalUsersRes,
      totalProductsRes,
      totalOrdersRes,
      lowStockRes,
    ] = await Promise.all([
      supabase.from("users").select("id", { count: "exact", head: true }),
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase.from("orders").select("id", { count: "exact", head: true }),
      supabase.from("products").select("id", { count: "exact" }).lt("stock", 10),
    ])

    return NextResponse.json({
      stats: {
        totalUsers: totalUsersRes.count || 0,
        totalProducts: totalProductsRes.count || 0,
        totalOrders: totalOrdersRes.count || 0,
        lowStock: lowStockRes.count || 0,
      },
    })
  } catch (error) {
    console.error("Get admin stats error:", error)
    return NextResponse.json(
      { error: "Failed to fetch stats", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
