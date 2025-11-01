// scripts/run/globalaircharters.ts
// Usage: npx tsx scripts/run/globalaircharters.ts
const start = Date.now()
console.log(`[globalaircharters] start`)

// Importing the source file executes it (it has its own main())
await import('./sources/globalaircharters')

const ms = Date.now() - start
console.log(`[globalaircharters] done in ${ms}ms`)