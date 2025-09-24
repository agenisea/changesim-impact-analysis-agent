/// <reference types="vitest/globals" />

import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { AnalysisDecisionTrace } from '@/components/impact-analysis/analysis-decision-trace'
import { AnalysisForm } from '@/components/impact-analysis/analysis-form'
import { AnalysisReportArtifact } from '@/components/impact-analysis/analysis-report-artifact'
import { AnalysisReportWrapper } from '@/components/impact-analysis/analysis-report-wrapper'
import { AnalysisResultWithArtifact } from '@/components/impact-analysis/analysis-report'
import { AnalysisRiskBadge } from '@/components/impact-analysis/analysis-risk-badge'
import { AnalysisSources } from '@/components/impact-analysis/analysis-sources'
import { ANALYSIS_STATUS } from '@/lib/utils/constants'
import type { ImpactAnalysisResult } from '@/types/impact-analysis'

const baseResult: ImpactAnalysisResult = {
  analysis_summary: `### Predicted Impacts\n- **Operational Continuity**: Productivity holds steady\n\n### Risk Factors\n- **Primary**: Risk detail here`,
  risk_level: 'high',
  risk_rationale: 'Systemic exposure',
  risk_factors: ['Productivity may decline', 'Morale could suffer'],
  risk_scoring: {
    scope: 'organization',
    severity: 'major',
    human_impact: 'limited',
    time_sensitivity: 'short_term',
  },
  decision_trace: ['Checked recent deployments', 'Assessed cultural readiness'],
  sources: [{ title: 'Change Management Playbook', url: 'https://example.com/change' }],
  meta: {
    timestamp: '2024-01-15T12:00:00.000Z',
    status: ANALYSIS_STATUS.COMPLETE,
    role: 'Support Team',
    changeDescription: 'Migrate to new CRM platform',
  },
}

describe('AnalysisDecisionTrace', () => {
  it('renders nothing when no items provided', () => {
    const { container } = render(<AnalysisDecisionTrace items={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders provided decision trace items', () => {
    render(<AnalysisDecisionTrace items={['Step one', 'Step two']} />)
    expect(screen.getByText('Analysis Process:')).toBeInTheDocument()
    expect(screen.getByText('Step one')).toBeInTheDocument()
    expect(screen.getByText('Step two')).toBeInTheDocument()
  })
})

describe('AnalysisSources', () => {
  it('returns null when no sources exist', () => {
    const { container } = render(<AnalysisSources items={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('lists external sources with links', () => {
    render(<AnalysisSources items={[{ title: 'APA Guidelines', url: 'https://www.apa.org' }]} />)
    const link = screen.getByRole('link', { name: 'APA Guidelines' })
    expect(link).toHaveAttribute('href', 'https://www.apa.org')
  })
})

describe('AnalysisRiskBadge', () => {
  it('renders risk badge with level metadata', () => {
    render(<AnalysisRiskBadge level="high" />)
    const badge = screen.getByRole('status', { name: 'Risk level: High' })
    expect(badge).toHaveTextContent('High Risk')
  })

  it('shows tooltip reason on hover', async () => {
    const user = userEvent.setup()
    render(<AnalysisRiskBadge level="medium" reason="Policy misalignment" />)
    const badge = screen.getByRole('status', { name: 'Risk level: Medium' })
    await user.hover(badge)
    const tooltips = await screen.findAllByRole('tooltip')
    expect(tooltips.some(node => node.textContent?.includes('Policy misalignment'))).toBe(true)
  })
})

describe('AnalysisForm', () => {
  it('prefills initial values when provided', () => {
    render(
      <AnalysisForm
        initial={{ role: 'Engineering Lead', changeDescription: 'Adopt new deployment tooling' }}
        onSubmit={vi.fn()}
      />
    )

    expect(screen.getByLabelText('Role or Team')).toHaveValue('Engineering Lead')
    expect(screen.getByLabelText('Proposed Change')).toHaveValue('Adopt new deployment tooling')
  })

  it('shows validation error when fields missing', async () => {
    const user = userEvent.setup()
    render(<AnalysisForm onSubmit={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Analyze Impact' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Please fill in both fields')
  })

  it('trims input and submits values', async () => {
    const user = userEvent.setup()
    const handleSubmit = vi.fn()
    render(<AnalysisForm onSubmit={handleSubmit} />)

    await user.type(screen.getByLabelText('Role or Team'), '  Finance Director  ')
    await user.type(screen.getByLabelText('Proposed Change'), '  Consolidate tools  ')

    await user.click(screen.getByRole('button', { name: 'Analyze Impact' }))

    expect(handleSubmit).toHaveBeenCalledWith({
      role: 'Finance Director',
      changeDescription: 'Consolidate tools',
    })
  })

  it('sets busy state on button when disabled externally', () => {
    render(<AnalysisForm onSubmit={vi.fn()} busy />)
    const button = screen.getByRole('button', { name: /Analyzing Impact/i })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })
})

describe('AnalysisReportWrapper', () => {
  it('renders title, subtitle, and actions', () => {
    const handleCopy = vi.fn()
    render(
      <AnalysisReportWrapper
        title="Impact Report"
        subtitle="Jan 1"
        actions={[{ id: 'copy', label: 'Copy', onClick: handleCopy }]}
      >
        <div>Content</div>
      </AnalysisReportWrapper>
    )

    expect(screen.getByText('Impact Report')).toBeInTheDocument()
    expect(screen.getByText('Jan 1')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
    expect(handleCopy).toHaveBeenCalled()
  })

  it('renders pending status icon styling', () => {
    const { container } = render(
      <AnalysisReportWrapper title="Pending" status={ANALYSIS_STATUS.PENDING}>
        <div />
      </AnalysisReportWrapper>
    )

    const icon = container.querySelector('svg.text-amber-600')
    expect(icon).not.toBeNull()
  })
})

describe('AnalysisReportArtifact', () => {
  beforeEach(() => {
    navigator.clipboard.writeText = vi.fn().mockResolvedValue(undefined)
  })

  it('renders role-specific sections when metadata available', () => {
    render(
      <AnalysisReportArtifact
        data={baseResult}
        role="Support Team"
        riskFactors={baseResult.risk_factors}
        proposedChange="Migrate to new CRM platform"
        showActions={false}
      />
    )

    expect(screen.getByText('Role:')).toBeInTheDocument()
    expect(screen.getByText('Support Team')).toBeInTheDocument()
    expect(screen.getByText('Migrate to new CRM platform')).toBeInTheDocument()
    expect(screen.getByText('Risk Assessment:')).toBeInTheDocument()
  })

  it('renders fallback risk badge when no role provided', () => {
    const resultWithoutRole: ImpactAnalysisResult = {
      ...baseResult,
      meta: baseResult.meta ? { ...baseResult.meta } : undefined,
    }

    if (resultWithoutRole.meta) {
      delete resultWithoutRole.meta.role
    }

    render(
      <AnalysisReportArtifact
        data={resultWithoutRole}
        riskFactors={[]}
        showActions={false}
      />
    )

    expect(screen.getByRole('status', { name: 'Risk level: High' })).toBeInTheDocument()
  })

  it('copies assembled report to clipboard', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    navigator.clipboard.writeText = writeText

    render(
      <AnalysisReportArtifact
        data={baseResult}
        role="Support Team"
        riskFactors={baseResult.risk_factors}
        proposedChange="Migrate to new CRM platform"
      />
    )

    await user.click(screen.getByRole('button', { name: 'Copy' }))

    expect(writeText).toHaveBeenCalledTimes(1)
    const payload = writeText.mock.calls[0]?.[0] ?? ''
    expect(payload).toContain('Impact Analysis Report')
    expect(payload).toContain('Support Team')
    expect(payload).toContain('Migrate to new CRM platform')
    expect(payload).toContain('Executive Summary')
  })
})

describe('AnalysisResultWithArtifact', () => {
  it('renders placeholder when no result provided', () => {
    render(<AnalysisResultWithArtifact result={null} />)
    expect(
      screen.getByText('Enter a role and change description to see the impact analysis')
    ).toBeInTheDocument()
  })

  it('displays report when result contains summary', () => {
    render(<AnalysisResultWithArtifact result={baseResult} />)
    expect(screen.getByText('Predicted Impacts')).toBeInTheDocument()
    expect(screen.getByText('Risk Factors')).toBeInTheDocument()
  })
})
