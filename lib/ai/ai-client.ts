/**
 * Shared AI client configuration
 *
 * This file provides a reusable OpenAI client instance to avoid
 * creating new clients on each request, improving performance
 * and reducing overhead during hot reloads.
 */

import { openai } from '@ai-sdk/openai'
import { MODEL } from '@/lib/utils/constants'

// Shared OpenAI model instance for impact analysis
export const impactModel = openai(MODEL)
