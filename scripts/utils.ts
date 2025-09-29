// scripts/utils.ts
import * as cheerio from 'cheerio'

export const UA =
  'AltidalBot/0.1 (+https://altidal.vercel.app; contact: hello@altidal.com)'

// Canonical aircraft class buckets used across the app.
// Extend if you add more categories later.
export type AcClass =
  | 'ultra-long'
  | 'heavy'
  | 'super-midsize'
  | 'midsize'
  | 'light'
  | 'unknown'

/**
 * Normalize a free-text aircraft class into a canonical bucket.
 * (No dependency on external types to avoid build errors.)
 */
export function normClass(s?: string): AcClass {
  if (!s) return 'unknown'
  const t = s.toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-')

  if (t.includes('ultra') || t.includes('ulr') || t.includes('long-range')) return 'ultra-long'
  if (t.includes('heavy') || t.includes('large-cabin')) return 'heavy'
  if ((t.includes('super') && t.includes('mid')) || t.includes('super-midsize')) return 'super-midsize'
  if (t.includes('mid')) return 'midsize'
  if (t.includes('light')) return 'light'

  return 'unknown'
}

/**
 * Parse a date-like string to ISO 8601, or throw if invalid.
 */
export function isoDate(s: string): string {
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) throw new Error(`Bad date: ${s}`)
  return d.toISOString()
}

/**
 * Cheerio loader helper.
 */
export function $(html: string) {
  return cheerio.load(html)
}

// Optional: re-export types if you have them.
// This is type-only and safe at runtime; remove if ./types doesn't exist.
export type { ScrapedLeg } from './types'