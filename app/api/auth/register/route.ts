import jwt from "jsonwebtoken"

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName, phone } = await request.json()

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: "Email, password, and full name are required" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone || null,
        },
      },
    })

    if (authError) {
      console.error("Supabase signUp error:", authError)
      return NextResponse.json(
        { error: "Registration failed", details: authError.message },
        { status: 500 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "User creation failed. Try again." },
        { status: 400 }
      )
    }

    const newUser = authData.user

    // Insert into our public users table
    const { error: insertError } = await supabase
      .from("users")
      .insert([
        {
          id: newUser.id,
          email: newUser.email!,
          full_name: fullName,
          phone: phone || null,
          role: "customer",
          is_verified: false,
        },
      ])

    if (insertError) {
      console.error("Insert user profile error:", insertError)
      return NextResponse.json(
        { error: "Failed to create user profile", details: insertError.message },
        { status: 500 }
      )
    }

    // Create app JWT for legacy frontend
    const token = jwt.sign(
      {
        id: newUser.id,
        email: newUser.email,
        role: "customer",
      },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    )

    return NextResponse.json({
      message: "User registered successfully",
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: fullName,
        role: "customer",
      },
    })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Registration failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
