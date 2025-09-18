import { type NextRequest, NextResponse } from "next/server"
import { generateImpactAnalysis } from "@/lib/impact-ai-service"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] API route called - analyzing impact")

    const { role, changeDescription } = await request.json()
    console.log("[v0] Request data:", { role, changeDescription })

    if (!role || !changeDescription) {
      console.log("[v0] Missing required fields")
      return NextResponse.json({ error: "Role and change description are required" }, { status: 400 })
    }

    console.log("[v0] Calling generateImpactAnalysis function")
    const analysis = await generateImpactAnalysis(role, changeDescription)
    console.log("[v0] Analysis completed successfully:", analysis)

    return NextResponse.json(analysis)
  } catch (error) {
    console.error("[v0] Impact analysis error:", error)
    console.error("[v0] Error details:", {
      message: (error as Error).message,
      stack: (error as Error).stack,
    })

    const errorMessage = (error as Error).message
    if (errorMessage.includes("429")) {
      return NextResponse.json(
        {
          error: "OpenAI API rate limit exceeded. Please try again in a few moments.",
        },
        { status: 429 },
      )
    } else if (errorMessage.includes("API error")) {
      return NextResponse.json(
        {
          error: "AI service temporarily unavailable. Please try again.",
        },
        { status: 503 },
      )
    } else {
      return NextResponse.json(
        {
          error: "Failed to analyze impact. Please try again.",
        },
        { status: 500 },
      )
    }
  }
}
