import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { ImpactResult } from "@/types/impact"
import { z } from "zod"
import { IMPACT_ANALYSIS_SYSTEM_PROMPT } from "@/components/agent/prompt"
import { mapRiskLevel } from "@/lib/evaluator"

const impactInputSchema = z.object({
  changeDescription: z.string().min(1, "Change description is required"),
  role: z.string().min(1, "Role is required"),
  context: z.any().optional(),
})

const impactResultSchema = z.object({
  summary_markdown: z.string(),
  risk_level: z.enum(["low", "medium", "high", "critical"]),
  risk_badge_reason: z.string().optional(),
  risk_reasons: z.array(z.string()).min(1).max(4),
  risk_scoring: z.object({
    scope: z.enum(["individual", "team", "organization", "national", "global"]),
    severity: z.enum(["minor", "moderate", "major", "catastrophic"]),
    human_impact: z.enum(["none", "limited", "significant", "mass_casualty"]),
    time_sensitivity: z.enum(["long_term", "short_term", "immediate", "critical"])
  }),
  decision_trace: z.array(z.string()).min(3).max(6),
  sources: z.array(z.object({
    title: z.string(),
    url: z.string(),
  })).min(2),
  meta: z.object({
    timestamp: z.string(),
    status: z.enum(["complete", "pending", "error"]).optional(),
    run_id: z.string().optional(),
    role: z.string().optional(),
    changeDescription: z.string().optional(),
  }).optional(),
})


export async function POST(request: NextRequest) {
  try {
    console.log("[impact] API route called")

    const body = await request.json()
    console.log("[impact] Request data:", body)

    // Validate input
    const validation = impactInputSchema.safeParse(body)
    if (!validation.success) {
      const errorMessage = validation.error.issues.map((err: any) => `${err.path.join('.')}: ${err.message}`).join(', ')
      console.log("[impact] Validation failed:", errorMessage)
      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }

    const { changeDescription, role, context } = validation.data

    const runId = `ia_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    // Generate impact analysis using AI SDK
    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      system: IMPACT_ANALYSIS_SYSTEM_PROMPT,
      prompt: `Analyze the impact of this organizational change:

Change Description: ${changeDescription}
${context ? `Additional Context: ${JSON.stringify(context)}` : ''}

Return only valid JSON matching the ImpactResult schema.`,
      temperature: 0.2,
      maxOutputTokens: 1500,
    })

    console.log("[impact] AI response received")

    let parsedResult: any
    try {
      // Clean the response and parse JSON
      const cleanedText = text.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '')
      parsedResult = JSON.parse(cleanedText)
    } catch (parseError) {
      console.error("[impact] Failed to parse AI response as JSON:", parseError)
      console.error("[impact] Raw response:", text)
      return NextResponse.json(
        { error: "Failed to parse AI response. Please try again." },
        { status: 500 }
      )
    }


    // Apply deterministic risk mapping
    const { scope, severity, human_impact, time_sensitivity } = parsedResult.risk_scoring;
    const riskResult = mapRiskLevel(
      scope as any, // assumes validated buckets; keep types minimal here
      severity as any,
      human_impact as any,
      time_sensitivity as any
    );
    parsedResult.risk_level = riskResult.level;

    // Add org-cap decision trace note when triggered
    if (riskResult.orgCapTriggered) {
      parsedResult.decision_trace?.push('Risk level adjusted to medium due to organizational scope limitations.');
    }

    if (parsedResult.risk_level) {
      parsedResult.risk_level = parsedResult.risk_level.toLowerCase() as "low" | "medium" | "high" | "critical"
    }

    // Add meta information
    parsedResult.meta = {
      ...parsedResult.meta,
      timestamp: new Date().toISOString(),
      status: "complete",
      run_id: runId,
      role: role,
      changeDescription: changeDescription,
    }

    // Validate the result against schema
    const resultValidation = impactResultSchema.safeParse(parsedResult)
    if (!resultValidation.success) {
      console.error("[impact] Result validation failed:", resultValidation.error)
      console.error("[impact] Parsed result:", parsedResult)
      return NextResponse.json(
        { error: "AI response format validation failed. Please try again." },
        { status: 500 }
      )
    }

    const result: ImpactResult = resultValidation.data

    console.log("[impact] Impact analysis completed successfully")
    return NextResponse.json(result)

  } catch (error) {
    console.error("[impact] Impact analysis error:", error)
    console.error("[impact] Error details:", {
      message: (error as Error).message,
      stack: (error as Error).stack,
    })

    const errorMessage = (error as Error).message
    if (errorMessage.includes("429")) {
      return NextResponse.json(
        { error: "AI service rate limit exceeded. Please try again in a few moments." },
        { status: 429 }
      )
    } else if (errorMessage.includes("API")) {
      return NextResponse.json(
        { error: "AI service temporarily unavailable. Please try again." },
        { status: 503 }
      )
    } else {
      return NextResponse.json(
        { error: "Failed to analyze impact. Please try again." },
        { status: 500 }
      )
    }
  }
}