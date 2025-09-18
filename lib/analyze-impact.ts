import { ImpactInput, ImpactResult } from "@/types/impact"

export async function submitImpactAnalysis(input: ImpactInput): Promise<ImpactResult> {
  const response = await fetch("/api/analyze-impact", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      role: input.role.trim(),
      changeDescription: input.changeDescription.trim(),
    }),
  })

  if (!response.ok) {
    throw new Error("Failed to analyze impact")
  }

  return response.json()
}