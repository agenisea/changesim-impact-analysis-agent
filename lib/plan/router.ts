// lib/plan/router.ts
import { Plan, RoutedResult, SubagentInput } from './types';
import { SUBAGENT_REGISTRY } from './subagents';

export async function executePlan(plan: Plan, input: SubagentInput): Promise<RoutedResult> {
  const actions: Array<{ kind: string; output: any }> = [];

  for (const sig of plan.signals) {
    const agent = SUBAGENT_REGISTRY[sig.kind];
    if (!agent) continue; // 'none' or unknown

    try {
      // Bounded execution; no external calls yet
      const output = await agent.run(input);
      actions.push({ kind: sig.kind, output });
    } catch (error) {
      console.error(`Subagent ${sig.kind} failed:`, error);
      // Continue with other subagents rather than failing completely
      actions.push({
        kind: sig.kind,
        output: {
          title: `${agent.name} failed`,
          recommendations: ['Manual review required'],
          notes: [`Error: ${error instanceof Error ? error.message : 'Unknown error'}`]
        }
      });
    }
  }

  return { plan, actions };
}

/**
 * Generate a summary of actions taken for logging/tracing
 */
export function summarizeActions(result: RoutedResult): {
  executed: string[];
  recommendationCount: number;
  summary: string;
} {
  const executed = result.actions.map(a => a.kind);
  const recommendationCount = result.actions.reduce(
    (sum, a) => sum + (a.output.recommendations?.length || 0),
    0
  );

  const summary = executed.length > 0
    ? `Executed: ${executed.join(', ')} (${recommendationCount} recommendations)`
    : 'No actions needed';

  return { executed, recommendationCount, summary };
}

/**
 * Extract key recommendations across all executed subagents
 */
export function extractKeyRecommendations(result: RoutedResult, limit = 5): string[] {
  const allRecommendations = result.actions.flatMap(a => a.output.recommendations || []);

  // Prioritize by the order of execution (higher priority subagents first)
  return allRecommendations.slice(0, limit);
}

/**
 * Check if any critical actions were triggered
 */
export function hasCriticalActions(result: RoutedResult): boolean {
  return result.plan.signals.some(s => s.priority === 1);
}

/**
 * Generate monitoring metrics across all subagents
 */
export function consolidateMetrics(result: RoutedResult): string[] {
  const allMetrics = result.actions.flatMap(a => a.output.metrics || []);

  // Deduplicate metrics
  return [...new Set(allMetrics)];
}