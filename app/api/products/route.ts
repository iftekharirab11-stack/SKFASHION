import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: products, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ products: products || [] })
  } catch (error) {
    console.error("Get products error:", error)
    return NextResponse.json(
      { error: "Failed to fetch products", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || ""

    const supabase = await createClient()

    // Get session user
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

    let productData: any = {}

    if (contentType.startsWith("multipart/form-data")) {
      const formData = await request.formData()
      const file = formData.get("image") as File | null

      // Upload image if provided
      if (file && file.size > 0) {
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const filename = `${Date.now()}_${file.name}`

        const { error: uploadError } = await supabase.storage
          .from("products")
          .upload(filename, buffer, {
            contentType: file.type,
            upsert: true,
          })

        if (uploadError) {
          console.error("Upload error:", uploadError)
          return NextResponse.json(
            { error: "Failed to upload image", details: uploadError.message },
            { status: 500 }
          )
        }

        const { data: publicUrl } = supabase.storage
          .from("products")
          .getPublicUrl(filename)

        productData.images = JSON.stringify([publicUrl.publicUrl])
      }

      // Parse text fields
      productData.name = formData.get("name") as string
      productData.category = formData.get("category") as string
      productData.price = parseFloat(formData.get("price") as string)
      productData.original_price = formData.get("originalPrice") ? parseFloat(formData.get("originalPrice") as string) : null
      productData.description = formData.get("description") as string
      productData.stock = parseInt(formData.get("stock") as string) || 0
    } else {
      // JSON body
      const body = await request.json()
      productData = {
        name: body.name,
        category: body.category,
        price: body.price,
        original_price: body.originalPrice,
        description: body.description,
        images: JSON.stringify(body.images || []),
        stock: body.stock || 0,
      }
    }

    const { error: insertError } = await supabase.from("products").insert([productData])

    if (insertError) throw insertError

    return NextResponse.json({ message: "Product created" })
  } catch (error) {
    console.error("Create product error:", error)
    return NextResponse.json(
      { error: "Failed to create product", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
