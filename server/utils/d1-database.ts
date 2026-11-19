import {
  createCloudflareD1DatabaseFromEnvironment,
  type D1Database,
} from '@cs-herramientas/d1-client'
import type { H3Event } from 'h3'

interface CloudflareEventContext {
  cloudflare?: {
    env?: {
      DB?: D1Database
    }
  }
}

export function getD1Database(event: H3Event): D1Database {
  const cloudflareContext = (
    event.context as typeof event.context & CloudflareEventContext
  ).cloudflare
  const binding = cloudflareContext?.env?.DB
  if (binding) return binding

  // Enables node-based Nuxt development and the ingestion CLIs.
  return createCloudflareD1DatabaseFromEnvironment(process.env)
}
