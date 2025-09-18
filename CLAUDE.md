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

## Import Conventions

- Use absolute imports with `@/` prefix
- Group imports: external libraries first, then internal modules
- Use kebab-case in import paths to match file names

```typescript
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FeatureForm } from "@/components/feature-form"
import { processData } from "@/lib/process-data"
import { DataType } from "@/types/data-type"
```

## Code Style

- Use TypeScript strict mode
- Prefer explicit return types for functions
- Use meaningful variable and function names
- Keep components small and focused
- Extract reusable logic into custom hooks or utility functions

## Testing Commands

When implementing new features, run these commands to ensure code quality:

```bash
# Add your project-specific commands here, e.g.:
# pnpm run lint
# pnpm run typecheck
# pnpm run test
# pnpm run build
```