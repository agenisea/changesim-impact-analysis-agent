interface ImpactAnalysis {
  role: string
  impact: string[]
}

export async function analyzeImpact(role: string, changeDescription: string): Promise<ImpactAnalysis> {
  console.log("[v0] Starting impact analysis for role:", role)
  console.log("[v0] Change description:", changeDescription)

  const prompt = `You are an organizational change expert. Analyze how the following change will impact the specified role/team.

Role/Team: ${role}
Proposed Change: ${changeDescription}

Provide a JSON response with exactly this structure:
{
  "role": "${role}",
  "impact": [
    "First specific impact (focus on immediate concerns)",
    "Second specific impact (focus on adaptation needs)", 
    "Third specific impact (focus on potential resistance or benefits)"
  ]
}

Guidelines:
- Each impact should be 8-15 words
- Focus on practical, actionable concerns
- Consider both challenges and opportunities
- Be specific to the role, not generic
- Think about workflow, skills, relationships, and responsibilities

Respond only with valid JSON.`

  const maxRetries = 3
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[v0] Attempt ${attempt}/${maxRetries} - Making OpenAI API call`)

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are an expert organizational change analyst. Always respond with valid JSON only.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 300,
        }),
      })

      console.log(`[v0] OpenAI API response status: ${response.status}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.log(`[v0] OpenAI API error response: ${errorText}`)

        if (response.status === 429) {
          const waitTime = Math.pow(2, attempt) * 1000 // Exponential backoff
          console.log(`[v0] Rate limited. Waiting ${waitTime}ms before retry ${attempt}/${maxRetries}`)

          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, waitTime))
            continue
          }
        }

        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log("[v0] OpenAI API response received successfully")

      const content = data.choices[0]?.message?.content
      console.log("[v0] OpenAI response content:", content)

      if (!content) {
        throw new Error("No response from OpenAI")
      }

      try {
        const analysis = JSON.parse(content)
        console.log("[v0] Successfully parsed JSON response:", analysis)

        // Validate the response structure
        if (!analysis.role || !Array.isArray(analysis.impact)) {
          throw new Error("Invalid response structure")
        }

        console.log("[v0] Impact analysis completed successfully")
        return analysis
      } catch (parseError) {
        console.error("[v0] Failed to parse OpenAI response:", content)
        throw new Error("Invalid JSON response from AI")
      }
    } catch (error) {
      console.error(`[v0] Attempt ${attempt} failed:`, error)
      lastError = error as Error

      if (attempt < maxRetries && (error as Error).message.includes("429")) {
        continue
      } else {
        break
      }
    }
  }

  throw lastError || new Error("Failed to analyze impact after all retries")
}
