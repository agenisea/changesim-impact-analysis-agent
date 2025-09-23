// lib/plan/subagents.ts
import type { SubagentInput, SubagentOutput, Subagent } from './types';

// ---- Concrete subagents (deterministic; no LLM required to start) ----

export const SequencePlanner: Subagent = {
  name: 'SequencePlanner',
  async run({ risk_scoring, diagnostics }): Promise<SubagentOutput> {
    const urgency = risk_scoring.time_sensitivity;
    const overload = diagnostics.orgSignals?.changeLoadPct ?? 100;
    const window = overload > 130 ? '12–16 weeks' : overload > 110 ? '6–10 weeks' : '3–6 weeks';

    return {
      title: 'Sequence changes to reduce overload',
      recommendations: [
        `Freeze non-critical changes for ${window}`,
        'Stage rollouts by team; avoid >1 major change per team per sprint',
        'Add temporary support (change champions) during peak weeks',
        'Publish a public change calendar with blackout periods'
      ],
      metrics: [
        'Weekly change-load index',
        'PR velocity variance',
        'Sentiment pulse (eNPS / short survey)'
      ],
      notes: [`Overload ~${overload}%`, `Urgency=${urgency}`]
    };
  }
};

export const SuccessionPlanner: Subagent = {
  name: 'SuccessionPlanner',
  async run({ diagnostics }): Promise<SubagentOutput> {
    const needInterim = diagnostics.orgSignals?.hasNamedSuccessor === false;
    return {
      title: 'Establish succession & trust bridges',
      recommendations: [
        needInterim ? 'Appoint interim leader within 5 business days' : 'Confirm and communicate successor charter',
        'Schedule trust-bridge sessions between affected teams',
        'Publish RACI for decision paths during transition',
        'Set 30/60/90-day check-ins with clear milestones'
      ],
      metrics: [
        'Decision latency trend',
        'Cross-team escalation count',
        'Manager 1:1 coverage rate'
      ],
      notes: ['Relationship conservation trigger']
    };
  }
};

export const CommunicationCoach: Subagent = {
  name: 'CommunicationCoach',
  async run({ diagnostics }): Promise<SubagentOutput> {
    const gaps = diagnostics.human_centered?.improvements ?? [];
    const score = diagnostics.human_centered?.score ?? 0.8;

    const recommendations = [
      'Add "we understand…" acknowledgment paragraph',
      'Spell out: what changes / when / who to contact',
      'List concrete supports: training, office hours, channels'
    ];

    // Add specific recommendations based on gaps
    if (gaps.some((g: string) => g.includes('language') || g.includes('dismissive'))) {
      recommendations.push('Remove dismissive words (just/simply/no big deal)');
    }

    if (gaps.some((g: string) => g.includes('timeline'))) {
      recommendations.push('Provide specific dates and milestones');
    }

    if (gaps.some((g: string) => g.includes('support'))) {
      recommendations.push('Detail available support resources and contact information');
    }

    return {
      title: 'Raise empathy & clarity in messaging',
      recommendations,
      metrics: ['Message clarity score', 'Support ticket topics/volume'],
      notes: [`Score: ${(score * 100).toFixed(0)}%`, ...gaps.slice(0, 3)]
    };
  }
};

export const CultureBridge: Subagent = {
  name: 'CultureBridge',
  async run({ diagnostics }): Promise<SubagentOutput> {
    const dist = diagnostics.orgSignals?.cultureDistance ?? 0.3;
    const timeline = dist > 0.8 ? '9–12 months' : dist > 0.5 ? '6–9 months' : '3–6 months';

    return {
      title: 'Create cultural bridge plan',
      recommendations: [
        'Identify 8–12 champions; run small pilots first',
        'Define rituals that reinforce new norms (weekly demos, retros)',
        'Publish "why now" narrative aligned to values',
        `Set ${timeline} reinforcement timeline with small wins`
      ],
      metrics: ['Adoption curve by org unit', 'Ritual participation rate'],
      notes: [`cultureDistance=${dist}`, `timeline=${timeline}`]
    };
  }
};

export const MonitoringSetup: Subagent = {
  name: 'MonitoringSetup',
  async run({ diagnostics }): Promise<SubagentOutput> {
    const gaps = diagnostics.perspectives?.gaps ?? [];
    const stakeholderGaps = gaps.length > 0 ? gaps.slice(0, 3).join(', ') : 'general coverage';

    return {
      title: 'Stand up early warning monitors',
      recommendations: [
        'Create a minimal KPI board (productivity, sentiment, attrition risk)',
        'Weekly stakeholder pulse (2 questions max)',
        'Define auto-rollback triggers for change stages',
        `Focus monitoring on: ${stakeholderGaps}`
      ],
      metrics: ['Pulse response rate', 'Rollback trigger count'],
      notes: ['Covers perspective gaps', `Gaps: ${stakeholderGaps}`]
    };
  }
};

// Registry for easy lookup
export const SUBAGENT_REGISTRY: Record<string, Subagent> = {
  sequence: SequencePlanner,
  succession: SuccessionPlanner,
  communication: CommunicationCoach,
  culture_bridge: CultureBridge,
  monitoring: MonitoringSetup,
};