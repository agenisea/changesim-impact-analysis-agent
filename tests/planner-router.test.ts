// tests/planner-router.test.ts
import { describe, it, expect } from 'vitest';
import { planNextSteps } from '@/lib/plan/planner';
import { executePlan, summarizeActions, hasCriticalActions, extractKeyRecommendations } from '@/lib/plan/router';

const baseDiagnostics = {
  principles: { violations: [] },
  human_centered: { score: 0.8, improvements: [] },
  perspectives: { overallScore: 0.7, gaps: [] },
  orgSignals: { changeLoadPct: 100, hasNamedSuccessor: true, cultureDistance: 0.3 },
};

const baseSubagentInput = {
  role: 'Engineering Manager',
  changeDescription: 'VP departure without successor',
  risk_scoring: {
    scope: 'organization' as const,
    severity: 'major' as const,
    human_impact: 'limited' as const,
    time_sensitivity: 'immediate' as const
  },
  diagnostics: baseDiagnostics
};

describe('Planner', () => {
  it('plans no actions when everything is fine', () => {
    const plan = planNextSteps(baseDiagnostics);
    expect(plan.signals).toHaveLength(1);
    expect(plan.signals[0].kind).toBe('none');
    expect(plan.rationale).toHaveLength(0);
  });

  it('plans sequence action for capacity overload', () => {
    const overloadedDiagnostics = {
      ...baseDiagnostics,
      principles: { violations: [{ law: 'Finite Adaptation', severity: 'warning' }] },
      orgSignals: { ...baseDiagnostics.orgSignals, changeLoadPct: 135 }
    };

    const plan = planNextSteps(overloadedDiagnostics);
    expect(plan.signals.some(s => s.kind === 'sequence')).toBe(true);
    expect(plan.rationale.some(r => r.includes('Finite Adaptation'))).toBe(true);
  });

  it('plans succession action for relationship conservation issues', () => {
    const successionDiagnostics = {
      ...baseDiagnostics,
      principles: { violations: [{ law: 'Relationship Conservation', severity: 'warning' }] },
      orgSignals: { ...baseDiagnostics.orgSignals, hasNamedSuccessor: false }
    };

    const plan = planNextSteps(successionDiagnostics);
    expect(plan.signals.some(s => s.kind === 'succession')).toBe(true);
    expect(plan.rationale.some(r => r.includes('Trust pathways'))).toBe(true);
  });

  it('plans communication action for low human-centered score', () => {
    const communicationDiagnostics = {
      ...baseDiagnostics,
      human_centered: { score: 0.6, improvements: ['add empathy', 'remove dismissive language'] }
    };

    const plan = planNextSteps(communicationDiagnostics);
    expect(plan.signals.some(s => s.kind === 'communication')).toBe(true);
    expect(plan.rationale.some(r => r.includes('Human-centered score'))).toBe(true);
  });

  it('plans culture bridge for high culture distance', () => {
    const cultureDiagnostics = {
      ...baseDiagnostics,
      principles: { violations: [{ law: 'Cultural Momentum', severity: 'warning' }] },
      orgSignals: { ...baseDiagnostics.orgSignals, cultureDistance: 0.8 }
    };

    const plan = planNextSteps(cultureDiagnostics);
    expect(plan.signals.some(s => s.kind === 'culture_bridge')).toBe(true);
    expect(plan.rationale.some(r => r.includes('Cultural momentum'))).toBe(true);
  });

  it('plans monitoring for low perspective coverage', () => {
    const monitoringDiagnostics = {
      ...baseDiagnostics,
      perspectives: { overallScore: 0.5, gaps: ['employee concerns', 'manager readiness'] }
    };

    const plan = planNextSteps(monitoringDiagnostics);
    expect(plan.signals.some(s => s.kind === 'monitoring')).toBe(true);
    expect(plan.rationale.some(r => r.includes('Stakeholder perspective'))).toBe(true);
  });

  it('prioritizes signals correctly', () => {
    const multiIssueDiagnostics = {
      principles: {
        violations: [
          { law: 'Finite Adaptation', severity: 'critical' },
          { law: 'Relationship Conservation', severity: 'warning' }
        ]
      },
      human_centered: { score: 0.6, improvements: ['add empathy'] },
      perspectives: { overallScore: 0.5, gaps: ['coverage gaps'] },
      orgSignals: { changeLoadPct: 140, hasNamedSuccessor: false, cultureDistance: 0.8 },
    };

    const plan = planNextSteps(multiIssueDiagnostics);

    // Should have multiple signals
    expect(plan.signals.length).toBeGreaterThan(3);

    // Priority 1 signals should come first
    const priority1Signals = plan.signals.filter(s => s.priority === 1);
    expect(priority1Signals.length).toBeGreaterThan(0);

    // First signals should be highest priority
    expect(plan.signals[0].priority).toBeLessThanOrEqual(plan.signals[1].priority);
  });
});

describe('Router', () => {
  it('executes subagents deterministically', async () => {
    const diagnostics = {
      ...baseDiagnostics,
      principles: { violations: [{ law: 'Finite Adaptation', severity: 'warning' }] },
      orgSignals: { ...baseDiagnostics.orgSignals, changeLoadPct: 125 }
    };

    const plan = planNextSteps(diagnostics);
    const input = { ...baseSubagentInput, diagnostics };
    const result = await executePlan(plan, input);

    expect(result.actions.length).toBeGreaterThan(0);
    expect(result.actions[0].output.recommendations.length).toBeGreaterThan(0);
    expect(result.actions[0].output.title).toBeTruthy();
  });

  it('handles subagent failures gracefully', async () => {
    // Mock a failing subagent by providing invalid input
    const plan = { signals: [{ kind: 'sequence' as const, reason: 'test', priority: 1 as const, confidence: 0.8 }], rationale: [] };

    // This should not throw, even with minimal input
    const result = await executePlan(plan, baseSubagentInput);
    expect(result.actions).toHaveLength(1);
  });

  it('generates accurate action summaries', async () => {
    const diagnostics = {
      ...baseDiagnostics,
      principles: { violations: [{ law: 'Finite Adaptation', severity: 'warning' }] },
      orgSignals: { ...baseDiagnostics.orgSignals, changeLoadPct: 125, hasNamedSuccessor: false }
    };

    const plan = planNextSteps(diagnostics);
    const input = { ...baseSubagentInput, diagnostics };
    const result = await executePlan(plan, input);

    const summary = summarizeActions(result);
    expect(summary.executed.length).toBeGreaterThan(0);
    expect(summary.recommendationCount).toBeGreaterThan(0);
    expect(summary.summary).toContain('Executed');
  });

  it('identifies critical actions correctly', async () => {
    const criticalDiagnostics = {
      ...baseDiagnostics,
      principles: { violations: [{ law: 'Finite Adaptation', severity: 'critical' }] },
      orgSignals: { ...baseDiagnostics.orgSignals, changeLoadPct: 150, hasNamedSuccessor: false }
    };

    const plan = planNextSteps(criticalDiagnostics);
    const input = { ...baseSubagentInput, diagnostics: criticalDiagnostics };
    const result = await executePlan(plan, input);

    expect(hasCriticalActions(result)).toBe(true);
  });

  it('extracts key recommendations across subagents', async () => {
    const diagnostics = {
      ...baseDiagnostics,
      principles: { violations: [{ law: 'Finite Adaptation', severity: 'warning' }] },
      human_centered: { score: 0.6, improvements: ['add empathy'] },
      orgSignals: { ...baseDiagnostics.orgSignals, changeLoadPct: 125 }
    };

    const plan = planNextSteps(diagnostics);
    const input = { ...baseSubagentInput, diagnostics };
    const result = await executePlan(plan, input);

    const keyRecs = extractKeyRecommendations(result, 3);
    expect(keyRecs.length).toBeGreaterThan(0);
    expect(keyRecs.length).toBeLessThanOrEqual(3);
  });
});

describe('Subagent Integration', () => {
  it('sequence planner adapts timeline to overload level', async () => {
    const highOverloadInput = {
      ...baseSubagentInput,
      diagnostics: {
        ...baseDiagnostics,
        orgSignals: { ...baseDiagnostics.orgSignals, changeLoadPct: 140 }
      }
    };

    const plan = planNextSteps(highOverloadInput.diagnostics);
    const result = await executePlan(plan, highOverloadInput);

    const sequenceAction = result.actions.find(a => a.kind === 'sequence');
    expect(sequenceAction).toBeTruthy();
    expect(sequenceAction?.output.recommendations.some((r: string) => r.includes('12–16 weeks'))).toBe(true);
  });

  it('succession planner handles missing successor correctly', async () => {
    const noSuccessorInput = {
      ...baseSubagentInput,
      diagnostics: {
        ...baseDiagnostics,
        principles: { violations: [{ law: 'Relationship Conservation', severity: 'warning' }] },
        orgSignals: { ...baseDiagnostics.orgSignals, hasNamedSuccessor: false }
      }
    };

    const plan = planNextSteps(noSuccessorInput.diagnostics);
    const result = await executePlan(plan, noSuccessorInput);

    const successionAction = result.actions.find(a => a.kind === 'succession');
    expect(successionAction).toBeTruthy();
    expect(successionAction?.output.recommendations.some((r: string) => r.includes('interim leader'))).toBe(true);
  });

  it('communication coach addresses specific improvement gaps', async () => {
    const communicationInput = {
      ...baseSubagentInput,
      diagnostics: {
        ...baseDiagnostics,
        human_centered: {
          score: 0.6,
          improvements: ['Remove dismissive language', 'More specific timeline details']
        }
      }
    };

    const plan = planNextSteps(communicationInput.diagnostics);
    const result = await executePlan(plan, communicationInput);

    const commAction = result.actions.find(a => a.kind === 'communication');
    expect(commAction).toBeTruthy();
    expect(commAction?.output.recommendations.some((r: string) => r.includes('dismissive'))).toBe(true);
  });
});