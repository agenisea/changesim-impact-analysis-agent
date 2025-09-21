# Claude Development Guidelines

This file contains coding conventions and guidelines for this Next.js TypeScript project.

## File Naming Conventions

- **Components**: Use kebab-case for all component files (e.g., `impact-form.tsx`, `user-profile.tsx`)
- **Utilities/Libraries**: Use kebab-case for utility and library files (e.g., `analyze-impact.ts`, `format-date.ts`)
- **Types**: Use kebab-case for type definition files (e.g., `impact.ts`, `user-types.ts`)
- **API Routes**: Follow Next.js convention with kebab-case (e.g., `analyze-impact/route.ts`)

## Project Structure

```
/components/           # Reusable UI components (kebab-case)
  /impact/            # Feature-specific component subfolders
  /ui/                # Generic UI component library
/lib/                 # Utility functions and business logic (kebab-case)
/types/               # Shared TypeScript type definitions (kebab-case)
/app/                 # Next.js app router pages and API routes
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
- **File names**: Use descriptive, purpose-driven names (e.g., `impact-report.tsx` not `impact-result-with-artifact.tsx`)
- **Function names**: Match the primary purpose (e.g., `ImpactReport` not `ImpactReportView`)
- **Avoid redundant suffixes**: Don't use `-with-artifact`, `-view`, `-component` unless truly necessary
- **Be specific**: `impact-form.tsx` is better than `form.tsx`

### Feature Organization
- **Group related files** in feature subdirectories (`/components/impact/`)
- **Use consistent prefixes** for related components (`impact-form`, `impact-report`, `impact-artifact`)
- **Avoid nested folder structures** beyond 2-3 levels deep

## Import Conventions

- Use absolute imports with `@/` prefix
- Group imports: external libraries first, then internal modules
- Use kebab-case in import paths to match file names
- **Remove unused imports** immediately to keep bundle size optimal

```typescript
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FeatureForm } from "@/components/feature-form"
import { processData } from "@/lib/process-data"
import { DataType } from "@/types/data-type"
```

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

- Create ImpactInput and ImpactResult shared types
- Extract client-side API wrapper function for impact analysis
- Separate business logic from UI components
```

## Prompt History Documentation

When requested to log session prompts, create a new file in `/prompts/` with this format:

### File Naming Convention
`claude-prompt-history-MM-DD-YYYY.prompt`

### File Format
```
# claude-prompt-history-MM-DD-YYYY.prompt
# defined: MM-DD-YYYY

This file contains all the prompts used during the [session description].

Prompt 1: [Brief Description]
[Full prompt text]

Prompt 2: [Brief Description]
[Full prompt text]

...

Summary of Session
[Brief description of what was accomplished in the session]
```

### Guidelines
- Use comment format (`#`) for filename and date headers
- Use `MM-DD-YYYY` date format consistently
- Number prompts sequentially throughout the session
- Include brief descriptive titles for each prompt
- Add a summary section at the end describing session outcomes
- Store all prompt history files in the `/prompts/` directory

## Testing Commands

When implementing new features, run these commands to ensure code quality:

```bash
# Lint the codebase
pnpm run lint

# Build the project (includes type checking)
pnpm run build

# Start development server
pnpm run dev

# Start production server
pnpm run start
```