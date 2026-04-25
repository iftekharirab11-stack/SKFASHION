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

    const { data: settings, error } = await supabase
      .from("settings")
      .select("*")
      .eq("id", 1)
      .single()

    if (error && error.code !== "PGRST116") {
      throw error
    }

    return NextResponse.json({
      settings: settings || {
        site_name: "SK Fashion Bangladesh",
        contact_phone: "+8801676456965",
        whatsapp_number: "8801676456965",
        facebook_url: "https://www.facebook.com/skfashionnn/",
      },
    })
  } catch (error) {
    console.error("Get settings error:", error)
    return NextResponse.json(
      { error: "Failed to fetch settings", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

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
      .from("settings")
      .upsert({ id: 1, ...body })

    if (error) throw error

    return NextResponse.json({ message: "Settings updated" })
  } catch (error) {
    console.error("Update settings error:", error)
    return NextResponse.json(
      { error: "Failed to update settings", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
