// lib/plan/types.ts
export type PlanKind =
  | 'sequence'         // capacity overload → sequence changes
  | 'succession'       // trust disruption / leader gap
  | 'communication'    // low empathy / unclear plan
  | 'culture_bridge'   // high culture distance / policy shift
  | 'monitoring'       // set up early warning + metrics
  | 'none';

export interface PlanSignal {
  kind: PlanKind;
  reason: string;
  priority: 1 | 2 | 3; // 1 = highest
  confidence: number;  // 0..1
}

export interface Plan {
  signals: PlanSignal[];
  rationale: string[];
}

export interface SubagentInput {
  role: string;
  changeDescription: string;
  risk_scoring: {
    scope: 'individual'|'team'|'organization'|'national'|'global';
    severity: 'minor'|'moderate'|'major'|'catastrophic';
    human_impact: 'none'|'limited'|'significant'|'mass_casualty';
    time_sensitivity: 'long_term'|'short_term'|'immediate'|'critical';
  };
  diagnostics: any; // principles/perspectives/human
}

export interface SubagentOutput {
  title: string;           // short label to surface in UI if desired
  recommendations: string[]; // concrete, actionable steps
  metrics?: string[];        // optional monitoring metrics
  notes?: string[];          // explainability crumbs
}

export interface Subagent {
  name: string;
  run(input: SubagentInput): Promise<SubagentOutput>;
}

export interface RoutedResult {
  plan: Plan;
  actions: Array<{ kind: string; output: SubagentOutput }>;
}