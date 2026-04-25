import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id
    const contentType = request.headers.get("content-type") || ""

    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    let updates: any = {}

    if (contentType.startsWith("multipart/form-data")) {
      const formData = await request.formData()
      const file = formData.get("image") as File | null

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

        updates.images = JSON.stringify([publicUrl.publicUrl])
      }

      // Text fields
      const name = formData.get("name") as string
      const category = formData.get("category") as string
      const price = formData.get("price") as string
      const originalPrice = formData.get("originalPrice") as string
      const description = formData.get("description") as string
      const stock = formData.get("stock") as string

      if (name) updates.name = name
      if (category) updates.category = category
      if (price) updates.price = parseFloat(price)
      if (originalPrice) updates.original_price = parseFloat(originalPrice)
      if (description) updates.description = description
      if (stock) updates.stock = parseInt(stock) || 0
    } else {
      const body = await request.json()
      updates = {
        name: body.name,
        category: body.category,
        price: body.price,
        original_price: body.originalPrice,
        description: body.description,
        images: JSON.stringify(body.images || []),
        stock: body.stock,
      }
    }

    const { error } = await supabase
      .from("products")
      .update(updates)
      .eq("id", id)

    if (error) throw error

    return NextResponse.json({ message: "Product updated" })
  } catch (error) {
    console.error("Update product error:", error)
    return NextResponse.json(
      { error: "Failed to update product", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Product ID required" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { error } = await supabase.from("products").delete().eq("id", id)

    if (error) throw error

    return NextResponse.json({ message: "Product deleted" })
  } catch (error) {
    console.error("Delete product error:", error)
    return NextResponse.json(
      { error: "Failed to delete product", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
