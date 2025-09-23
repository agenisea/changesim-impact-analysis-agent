// lib/plan/planner.ts
import { Plan, PlanSignal } from './types';

export function planNextSteps(diagnostics: {
  principles: { violations: Array<{ law: string; severity: string }> };
  human_centered: { score: number; improvements: string[] };
  perspectives: { overallScore: number; gaps: string[] };
  orgSignals?: { changeLoadPct?: number; hasNamedSuccessor?: boolean; cultureDistance?: number };
}): Plan {
  const signals: PlanSignal[] = [];
  const why: string[] = [];

  const v = diagnostics.principles.violations ?? [];
  const has = (lawSubstr: string) => v.some(x => x.law.toLowerCase().includes(lawSubstr));

  // Finite capacity → sequence
  if (has('finite') || (diagnostics.orgSignals?.changeLoadPct ?? 0) > 110) {
    signals.push({
      kind: 'sequence',
      reason: 'capacity overload detected',
      priority: 1,
      confidence: 0.85
    });
    why.push('Finite Adaptation concern / high change load');
  }

  // Relationship conservation → succession
  if (has('relationship') && diagnostics.orgSignals?.hasNamedSuccessor === false) {
    signals.push({
      kind: 'succession',
      reason: 'trust pathway disruption & no successor',
      priority: 1,
      confidence: 0.8
    });
    why.push('Trust pathways disrupted; no successor');
  }

  // Human-centered gaps → communication subagent
  if (diagnostics.human_centered.score < 0.75) {
    signals.push({
      kind: 'communication',
      reason: 'empathy/clarity gaps',
      priority: 2,
      confidence: 0.75
    });
    why.push('Human-centered score < 0.75');
  }

  // Culture momentum → bridge plan
  if (has('cultural') || (diagnostics.orgSignals?.cultureDistance ?? 0) >= 0.7) {
    signals.push({
      kind: 'culture_bridge',
      reason: 'high culture distance / momentum risk',
      priority: 2,
      confidence: 0.7
    });
    why.push('Cultural momentum risk / distance high');
  }

  // Low perspective coverage → monitoring
  if (diagnostics.perspectives.overallScore < 0.6) {
    signals.push({
      kind: 'monitoring',
      reason: 'coverage gaps across stakeholders',
      priority: 3,
      confidence: 0.7
    });
    why.push('Stakeholder perspective coverage low');
  }

  if (signals.length === 0) {
    signals.push({
      kind: 'none',
      reason: 'no follow-ups needed',
      priority: 3,
      confidence: 0.9
    });
  }

  // Stable order: by priority, then confidence desc
  signals.sort((a, b) => a.priority - b.priority || b.confidence - a.confidence);

  return { signals, rationale: why };
}