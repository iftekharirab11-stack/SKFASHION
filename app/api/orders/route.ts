import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: orders, error } = await supabase
      .from("orders")
      .select(`
        *,
        users(email, full_name)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ orders: orders || [] })
  } catch (error) {
    console.error("Get orders error:", error)
    return NextResponse.json(
      { error: "Failed to fetch orders", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { error } = await supabase.from("orders").insert([
      {
        user_id: user.id,
        items: JSON.stringify(body.items || []),
        total: body.total,
        status: "pending",
        customer_note: body.note || null,
      },
    ])

    if (error) throw error

    return NextResponse.json({ message: "Order created" })
  } catch (error) {
    console.error("Create order error:", error)
    return NextResponse.json(
      { error: "Failed to create order", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
