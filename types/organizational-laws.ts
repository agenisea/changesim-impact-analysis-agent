/**
 * Fundamental Laws of Organizational Dynamics
 *
 * These types encode the immutable principles that govern how organizations
 * respond to change. They serve as invariants that must be tested in any
 * impact analysis.
 */

// === CONSERVATION LAWS ===

export interface EnergyConservation {
  totalOrganizationalCapacity: number // finite resource
  currentAllocation: ResourceAllocation[]
  changeEnergyRequired: number
  availableCapacity: number // derived: total - sum(allocated)
  overloadRisk: 'none' | 'mild' | 'severe' | 'breakdown'
}

export interface ResourceAllocation {
  area: 'operational' | 'learning' | 'adaptation' | 'emotional_processing'
  allocated: number
  priority: 'critical' | 'important' | 'optional'
}

export interface TrustConservation {
  relationships: TrustRelationship[]
  trustTransfers: TrustTransfer[]
  totalTrustInSystem: number // sum of all relationship trust
}

export interface TrustRelationship {
  from: string // role/person
  to: string // role/person
  currentLevel: number // 0-10
  stability: 'fragile' | 'stable' | 'resilient'
}

export interface TrustTransfer {
  from: TrustRelationship
  to: TrustRelationship
  amount: number
  mechanism: 'introduction' | 'reputation' | 'demonstration' | 'time'
}

// === STRUCTURAL INVARIANTS ===

export interface HierarchyPreservation {
  formalStructure: OrganizationalNode[]
  informalInfluence: InfluenceNetwork
  decisionMakingPaths: DecisionPath[]
  structuralIntegrity: 'intact' | 'stressed' | 'fragmented' | 'collapsed'
}

export interface OrganizationalNode {
  id: string
  type: 'individual' | 'team' | 'department' | 'division'
  formalAuthority: AuthorityLevel
  actualInfluence: number // 0-10
  connections: string[] // ids of connected nodes
}

export type AuthorityLevel = 'none' | 'limited' | 'moderate' | 'significant' | 'executive'

export interface InfluenceNetwork {
  nodes: InfluenceNode[]
  edges: InfluenceEdge[]
  centralityScores: Record<string, number>
}

export interface InfluenceNode {
  id: string
  influence: number
  expertise: string[]
  socialCapital: number
}

export interface InfluenceEdge {
  from: string
  to: string
  strength: number
  type: 'mentorship' | 'collaboration' | 'reporting' | 'friendship' | 'expertise'
}

export interface DecisionPath {
  trigger: string
  nodes: string[] // ordered path from initiation to execution
  backupPaths: string[][] // alternative routes if primary blocked
  criticalityScore: number
}

// === HUMAN SYSTEM LAWS ===

export interface EmotionalContinuity {
  individualStates: EmotionalState[]
  groupDynamics: GroupEmotionalState[]
  transitionPatterns: EmotionalTransition[]
  stabilityFactors: StabilityFactor[]
}

export interface EmotionalState {
  individual: string
  currentState: EmotionalProfile
  capacity: AdaptationCapacity
  stressors: Stressor[]
  supports: SupportSystem[]
}

export interface EmotionalProfile {
  primary: 'confident' | 'anxious' | 'excited' | 'resistant' | 'overwhelmed' | 'curious'
  intensity: number // 1-10
  stability: 'volatile' | 'fluctuating' | 'stable'
  duration: 'momentary' | 'situational' | 'persistent' | 'chronic'
}

export interface AdaptationCapacity {
  current: number // 0-10
  historical: number // baseline
  factors: CapacityFactor[]
}

export interface CapacityFactor {
  factor: 'experience' | 'support' | 'autonomy' | 'meaning' | 'resources' | 'health'
  impact: number // -5 to +5
  description: string
}

export interface Stressor {
  source: 'workload' | 'uncertainty' | 'relationships' | 'skills' | 'values' | 'control'
  intensity: number // 1-10
  duration: 'acute' | 'chronic'
  trend: 'increasing' | 'stable' | 'decreasing'
}

export interface SupportSystem {
  type: 'peer' | 'manager' | 'family' | 'professional' | 'organizational'
  strength: number // 1-10
  accessibility: 'immediate' | 'available' | 'limited' | 'unavailable'
}

export interface GroupEmotionalState {
  group: string
  collectiveEmotion: EmotionalProfile
  cohesion: number // 0-10
  emotionalContagion: ContagionPattern[]
}

export interface ContagionPattern {
  source: string
  emotion: string
  spreadRate: number
  resistance: number
  containment: ContainmentStrategy[]
}

export interface ContainmentStrategy {
  method: 'communication' | 'leadership' | 'structure' | 'ritual' | 'time'
  effectiveness: number // 0-10
  implementationCost: number
}

export interface EmotionalTransition {
  from: EmotionalProfile
  to: EmotionalProfile
  triggers: string[]
  typicalDuration: string // e.g., "2-4 weeks"
  interventions: Intervention[]
}

export interface Intervention {
  type: 'communication' | 'training' | 'support' | 'structure' | 'time' | 'ritual'
  effectiveness: number // 0-10
  effort: number // 1-10
  description: string
}

export interface StabilityFactor {
  factor: 'routine' | 'relationships' | 'meaning' | 'autonomy' | 'competence' | 'safety'
  currentLevel: number // 0-10
  changeImpact: number // -10 to +10
  recoveryTime: string
}

// === VALIDATION FUNCTIONS ===

export interface OrganizationalLaws {
  validateEnergyConservation: (change: any, context: OrganizationalContext) => ValidationResult
  validateTrustConservation: (change: any, context: OrganizationalContext) => ValidationResult
  validateHierarchyPreservation: (change: any, context: OrganizationalContext) => ValidationResult
  validateEmotionalContinuity: (change: any, context: OrganizationalContext) => ValidationResult
}

export interface OrganizationalContext {
  size: number
  culture: CultureProfile
  maturity: 'startup' | 'growth' | 'mature' | 'decline'
  industry: string
  currentStressors: string[]
  recentChanges: RecentChange[]
}

export interface CultureProfile {
  values: string[]
  practices: string[]
  tolerance: ChangeToleranceProfile
  communication: CommunicationStyle
}

export interface ChangeToleranceProfile {
  pace: 'slow' | 'moderate' | 'fast' | 'rapid'
  complexity: 'simple' | 'moderate' | 'complex' | 'chaotic'
  riskAppetite: 'conservative' | 'balanced' | 'aggressive'
}

export interface CommunicationStyle {
  formality: 'informal' | 'mixed' | 'formal'
  transparency: 'closed' | 'selective' | 'open'
  frequency: 'sparse' | 'regular' | 'constant'
  channels: string[]
}

export interface RecentChange {
  type: string
  impact: 'low' | 'medium' | 'high' | 'critical'
  timeAgo: string
  resolution: 'resolved' | 'ongoing' | 'failed'
}

export interface ValidationResult {
  valid: boolean
  violations: LawViolation[]
  recommendations: string[]
  confidence: number // 0-1
}

export interface LawViolation {
  law: string
  severity: 'warning' | 'error' | 'critical'
  description: string
  predictedConsequence: string
  mitigation: string[]
}

// === THOUGHT EXPERIMENT FRAMEWORK ===

export interface ThoughtExperiment {
  name: string
  scenario: ExtremeScenario
  testConditions: TestCondition[]
  expectedInvariants: string[]
  measures: ExperimentMeasure[]
}

export interface ExtremeScenario {
  description: string
  variables: ScenarioVariable[]
  constraints: string[]
  duration: string
}

export interface ScenarioVariable {
  name: string
  type: 'quantitative' | 'qualitative' | 'boolean'
  range: any // depends on type
  extremeValue: any
}

export interface TestCondition {
  condition: string
  measurable: boolean
  threshold: any
}

export interface ExperimentMeasure {
  metric: string
  unit: string
  baseline: number
  prediction: number
  tolerance: number
}