# Claude Development Guidelines

This file contains coding conventions and guidelines for this Next.js TypeScript project.

## File Naming Conventions

- **Components**: Use kebab-case for all component files (e.g., `impact-form.tsx`, `user-profile.tsx`)
- **Utilities/Libraries**: Use kebab-case for utility and library files (e.g., `impact-analysis.ts`, `format-date.ts`)
- **Types**: Use kebab-case for type definition files (e.g., `impact-analysis.ts`, `user-types.ts`)
- **API Routes**: Follow Next.js convention with kebab-case (e.g., `impact-analysis/route.ts`)

## Project Structure

```
/components/           # Reusable UI components (kebab-case)
  /impact-analysis/   # Feature-specific component subfolders
  /ui/                # Generic UI component library
/lib/                 # Organized by subdomain (kebab-case)
  /ai/                # AI/LLM configuration, prompts, model setup
  /business/          # Core business logic and evaluators
  /client/            # Browser-side utilities (UI utils, client API wrappers)
  /db/                # Database clients and queries
  /server/            # Server-only utilities (session management, logging)
  /utils/             # Shared utilities (constants, hashing, retry logic)
/types/               # Shared TypeScript type definitions (kebab-case)
/app/                 # Next.js app router pages and API routes
/database/            # SQL schemas, migrations, functions
  /functions/         # Future SQL functions (RPCs, FTS, vector search)
```

## Component Guidelines

### Creating New Features

When adding new features, follow this modular approach:

1. **Define Types First** (`types/feature-name.ts`)
   - Create interfaces for inputs, outputs, and state
   - Export all types that will be shared across components

2. **Create Business Logic** (`lib/feature-name.ts`)
   - Implement core functionality and API calls
   - Keep components free of business logic
   - Return strongly typed results

3. **Build Components** (`components/feature-*.tsx`)
   - Create focused, single-responsibility components
   - Use proper TypeScript props interfaces
   - Handle UI state and user interactions only

4. **Wire Together in Pages** (`app/page.tsx` or `app/feature/page.tsx`)
   - Combine components with business logic
   - Handle loading, error, and success states
   - Keep page components as orchestrators

### Component Props Patterns

```typescript
// Form components should accept:
interface FormProps {
  initial?: InputType
  onSubmit: (data: InputType) => Promise<void> | void
  busy?: boolean
}

// Display components should accept:
interface DisplayProps {
  data: DataType | null
  loading?: boolean
  error?: string
}
```

## Naming Conventions

### Component Naming

- **File names**: Use descriptive, purpose-driven names (e.g., `analysis-report.tsx` not `analysis-result-with-artifact.tsx`)
- **Function names**: Match the primary purpose (e.g., `AnalysisReport` not `AnalysisReportView`)
- **Avoid redundant suffixes**: Don't use `-with-artifact`, `-view`, `-component` unless truly necessary
- **Be specific**: `impact-form.tsx` is better than `form.tsx`

### Feature Organization

- **Group related files** in feature subdirectories (`/components/impact-analysis/`)
- **Use consistent prefixes** for related components (`analysis-form`, `analysis-report`, `analysis-artifact`)
- **Use Analysis* naming pattern** for all impact analysis components (e.g., `AnalysisForm`, `AnalysisReport`, `AnalysisRiskBadge`)
- **Avoid nested folder structures** beyond 2-3 levels deep

## Import Conventions

- Use absolute imports with `@/` prefix
- Group imports: external libraries first, then internal modules
- Use kebab-case in import paths to match file names
- **Remove unused imports** immediately to keep bundle size optimal
- **Import from specific subdomain paths** for better organization:

```typescript
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { AnalysisForm } from '@/components/impact-analysis/analysis-form'
import { submitImpactAnalysis } from '@/lib/client/impact-analysis'
import { impactModel } from '@/lib/ai/ai-client'
import { ANALYSIS_STATUS } from '@/lib/utils/constants'
import { mapRiskLevel } from '@/lib/business/evaluator'
import { sb } from '@/lib/db/db'
import { getSessionIdCookie } from '@/lib/server/session'
import { cn } from '@/lib/client/ui-utils'
import { ImpactAnalysisInput } from '@/types/impact-analysis'
```

### Subdomain Import Guidelines

- **`@/lib/ai/*`**: AI/LLM prompts, model configuration, AI client setup
- **`@/lib/business/*`**: Core business logic, risk evaluation, data transformations
- **`@/lib/client/*`**: Browser-safe utilities, client-side API wrappers, UI utilities
- **`@/lib/db/*`**: Database clients, queries, schema types
- **`@/lib/server/*`**: Server-only utilities (session management, logging)
- **`@/lib/utils/*`**: Shared utilities (constants, hashing, retry logic)

## Dependency Management

- **Only add packages that are actively used** - Never install dependencies "just in case"
- **Remove unused dependencies** immediately when refactoring or removing features
- **Check existing dependencies** before adding new ones - reuse what's already available
- **Prefer built-in solutions** over external packages when functionality is simple

## Code Style

- Use TypeScript strict mode
- Prefer explicit return types for functions
- Use meaningful variable and function names
- Keep components small and focused
- Extract reusable logic into custom hooks or utility functions

## Security and Data Privacy Guidelines

### Constants and Configuration

- **Single Source of Truth**: All static values must be defined in `lib/utils/constants.ts`
- **Naming Convention**: Use clean, descriptive names without unnecessary prefixes
  - ✅ `MODEL`, `TEMPERATURE`, `PROMPT_VERSION`
  - ❌ `DEFAULT_MODEL`, `DEFAULT_TEMPERATURE`
- **No Hardcoded Values**: Never use hardcoded strings or numbers in API routes or components
- **Runtime Values**: Extract actual runtime values from objects (e.g., `impactModel.modelId`) rather than assuming constants

### Data Exposure Rules

- **Never expose sensitive data** in API responses:
  - ❌ Session IDs (`session_id`)
  - ❌ Input hashes (`input_hash`)
  - ❌ Internal database IDs (except public `run_id`)
  - ❌ Any portion of hash values (not even substring(0, 8))
- **Safe to expose** in API responses:
  - ✅ Static values (timestamps, status, role, changeDescription)
  - ✅ Public identifiers (`run_id`)
  - ✅ Non-sensitive metadata (`_cache` for transparency)

### Database Logging

- **All fields must use real values**:
  - ✅ Extract actual model from AI client: `impactModel.modelId`
  - ✅ Use constants for static config: `TEMPERATURE`, `PROMPT_VERSION`
  - ✅ Capture real usage data: `usage?.inputTokens`
  - ❌ No hardcoded strings or placeholder values
- **Explicit field mapping**: Always set all database fields explicitly, don't rely on defaults

### PII and Sensitive Data

- **Never log or expose**:
  - User credentials or authentication tokens
  - Full session identifiers in client responses
  - Internal system paths or configuration details
  - Hash values or cryptographic keys
- **Logging guidelines**:
  - Server-side logs can contain abbreviated identifiers for debugging
  - Client-side should receive minimal, safe metadata only
  - Use `console.log` statements without exposing sensitive values

### Environment Variables

- **Server-only secrets**: Use `SUPABASE_KEY` only in server-side code
- **Never bundle client-side**: Ensure no secret keys are included in client bundles
- **Validation**: Always validate environment variables exist with helpful error messages
- **Build-time safety**: Handle missing env vars gracefully during build process

## UX and Accessibility Guidelines

### User Experience Principles

- **Immediate feedback**: Always provide loading states and progress indicators
- **Error transparency**: Show clear, actionable error messages with recovery options
- **Consistent branding**: Use "ChangeSim Impact Analysis" consistently across all UI elements
- **Performance perception**: Use proper loading skeletons instead of generic spinners
- **Predictable interactions**: Maintain consistent UI patterns and behaviors

### Accessibility Standards

- **ARIA attributes**: Always include proper ARIA labels for interactive elements
  - `aria-required="true"` for required form fields
  - `aria-invalid` for validation states
  - `aria-describedby` to link fields with error messages
  - `aria-busy` for loading states
  - `role="alert"` and `aria-live="polite"` for dynamic error messages
  - `aria-hidden="true"` for decorative icons

- **Semantic HTML**: Use proper HTML elements and form structure
- **Keyboard navigation**: Ensure all interactive elements are keyboard accessible
- **Focus management**: Proper focus indicators and logical tab order
- **Error handling**: Associate error messages with form fields using `id` and `aria-describedby`

### Form Design Patterns

```typescript
// Required field example
<Input
  id="fieldName"
  aria-required="true"
  aria-invalid={error ? "true" : "false"}
  aria-describedby={error ? "field-error" : undefined}
/>

// Error message example
{error && (
  <div
    id="field-error"
    role="alert"
    aria-live="polite"
  >
    <Icon aria-hidden="true" />
    {error}
  </div>
)}
```

## Code Organization Rules

### Constants Management

- **Use constants for magic strings** - Always define reusable string literals in `lib/config/constants.ts`
- **Cache status consistency** - Use `CACHE_STATUS` constants for both headers and meta fields to ensure identical values
- **Analysis status consistency** - Use `ANALYSIS_STATUS` constants across API routes and UI components
- **Single source of truth** - Import constants rather than duplicating string literals across files
- **Type safety** - Export corresponding TypeScript types (e.g., `CacheStatus`, `AnalysisStatus`) for compile-time validation

Example:
```typescript
// lib/config/constants.ts
export const ANALYSIS_STATUS = {
  COMPLETE: 'complete',
  PENDING: 'pending',
  ERROR: 'error'
} as const

export type AnalysisStatus = typeof ANALYSIS_STATUS[keyof typeof ANALYSIS_STATUS]

// Usage across codebase
status: ANALYSIS_STATUS.COMPLETE
case ANALYSIS_STATUS.PENDING:
```

### Dead Code Prevention

- **Remove unused features immediately** - Don't leave dormant code that "might be useful later"
- **Delete unused components** and their associated files when refactoring
- **Clean up unused props** and parameters during component updates
- **Remove commented-out code** - use git history instead

### Type Management

- **Consolidate duplicate types** - avoid multiple interfaces for the same data structure
- **Use a single source of truth** for shared types
- **Remove optional properties** that are never actually used
- **Keep type definitions close** to where they're primarily used

## Commit Message Format

Use conventional commits with clear, descriptive messages:

```
<type>: <description>

- Bullet point describing specific change
- Another bullet point for additional changes
- Keep each bullet focused and actionable
```

### Commit Types

- **feat**: New feature or functionality
- **fix**: Bug fixes
- **refactor**: Code restructuring without changing functionality
- **docs**: Documentation changes
- **style**: Code formatting, missing semicolons, etc.
- **test**: Adding or updating tests
- **chore**: Maintenance tasks, dependency updates

### Multi-commit Strategy

For large changes, break into logical commits:

1. **Types/Logic**: Extract shared types and business logic
2. **Components**: Create reusable UI components
3. **Naming/Docs**: Improve naming clarity and add documentation

### Example Commit Messages

```bash
refactor: extract shared types and client-side API logic

- Create ImpactAnalysisInput and ImpactAnalysisResult shared types in types/impact-analysis.ts
- Extract client-side API wrapper function for impact analysis
- Separate business logic from UI components
```

## Session Logging Protocol

To preserve full fidelity conversation logs and prevent context loss, follow this systematic logging approach:

### Logging Schedule

**Automatic Triggers** (Claude should proactively export):
- Every 2 hours during active development
- Before major architecture changes or refactoring
- After completing significant milestones (tests passing, deployments)
- Before approaching context limits

**Manual Triggers**:
- When user requests logging
- Before switching focus areas
- End of development sessions

### File Organization

```
/prompts/
  ├── claude-session-01-23-2025.prompt    # Single file per day
  ├── claude-session-01-24-2025.prompt    # Next day
  └── claude-prompt-history-*.prompt      # Legacy format (deprecated)
```

### Session Export Format

**Single Session File** (`claude-session-MM-DD-YYYY.prompt`):
```
# claude-session-MM-DD-YYYY.prompt
# defined: MM-DD-YYYY

This file contains the complete session log for MM-DD-YYYY.

================================================================================
SESSION OVERVIEW
================================================================================
Focus: [Brief description of session goals]
Duration: [Start - End time if known]
Major Achievements: [Key accomplishments]

================================================================================
FULL CONVERSATION
================================================================================
[Complete conversation with all prompts, responses, and technical context]

================================================================================
FILES MODIFIED
================================================================================
[All files created/modified with descriptions]

================================================================================
TECHNICAL DECISIONS
================================================================================
[Key architecture choices and rationale]

================================================================================
NEXT STEPS
================================================================================
[Current state, blockers, planned follow-ups]
```

### Best Practices

- **Export early and often** - don't wait for context limits
- **Scrub sensitive data** before logging (API keys, real org names)
- **Include full technical context** - decisions, alternatives, implementation details
- **Document architecture evolution** - rationale for design choices
- **Preserve debugging sessions** - error messages and resolution steps

### Quick Reference

See `/docs/session-logging-protocol.md` for complete implementation details.
- Add a summary section at the end describing session outcomes
- Store all prompt history files in the `/prompts/` directory

## Testing Commands

When implementing new features, run these commands to ensure code quality:

```bash
# Run test suite
pnpm run test

# Run tests in watch mode during development
pnpm run test:watch

# Lint the codebase
pnpm run lint

# Format code with Prettier
pnpm run format

# Check code formatting
pnpm run format:check

# Build the project (includes type checking)
pnpm run build

# Start development server
pnpm run dev

# Start production server
pnpm run start
```

### Testing Guidelines

- All business logic should have corresponding tests
- Focus on testing critical functions like `mapRiskLevel` in `lib/business/evaluator.ts`
- Run tests before committing changes
- Use descriptive test names that explain the expected behavior