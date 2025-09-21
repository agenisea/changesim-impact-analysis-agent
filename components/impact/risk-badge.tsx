import { Shield, ShieldAlert, ShieldX, AlertTriangle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

interface RiskBadgeProps {
  level: RiskLevel
  reason?: string
}

const riskConfigs = {
  low: {
    icon: Shield,
    text: 'Low Risk',
    className:
      'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
    ariaLabel: 'Risk level: Low',
  },
  medium: {
    icon: ShieldAlert,
    text: 'Medium Risk',
    className:
      'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    ariaLabel: 'Risk level: Medium',
  },
  high: {
    icon: ShieldX,
    text: 'High Risk',
    className:
      'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    ariaLabel: 'Risk level: High',
  },
  critical: {
    icon: AlertTriangle,
    text: 'Critical Risk',
    className:
      'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    ariaLabel: 'Risk level: Critical',
  },
}

export function RiskBadge({ level, reason }: RiskBadgeProps) {
  const config = riskConfigs[level]
  const Icon = config.icon

  const badge = (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${config.className}`}
      role="status"
      aria-label={config.ariaLabel}
    >
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      {config.text}
    </div>
  )

  if (reason) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">{reason}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return badge
}
