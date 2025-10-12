import { NextResponse } from 'next/server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export function GET() {
  const spec = {
    openapi: '3.0.3',
    info: { title: 'Altidal API', version: '0.1.0' },
    servers: [{ url: 'http://localhost:3000' }],
    paths: {
      '/api/legs': {
        get: {
          summary: 'Search legs',
          parameters: [
            { name: 'from', in: 'query', schema: { type: 'string', minLength: 3, maxLength: 3 } },
            { name: 'to', in: 'query', schema: { type: 'string', minLength: 3, maxLength: 3 } },
            { name: 'operator', in: 'query', schema: { type: 'string', enum: ['airpartner', 'xo', 'magellan'] } },
            { name: 'start', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'end', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'seats', in: 'query', schema: { type: 'integer', minimum: 1 } },
            { name: 'minPrice', in: 'query', schema: { type: 'number', minimum: 0 } },
            { name: 'maxPrice', in: 'query', schema: { type: 'number', minimum: 0 } },
            { name: 'class', in: 'query', schema: { type: 'string' } },
            { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 200, default: 50 } },
          ],
          responses: {
            '200': { description: 'OK' },
            '400': { description: 'Bad request' },
            '500': { description: 'Server error' },
          },
        },
      },
    },
  }
  return NextResponse.json(spec)
}