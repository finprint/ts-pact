import pactLang from 'pact-lang-api'

import { IKeyPair } from '../types'

/**
 * Get the admin key pair from environmental variables, or default to a random key.
 */
export function getAdminKeyPair(): IKeyPair {
  if (process.env.PACT_ADMIN_PUBLIC && process.env.PACT_ADMIN_PRIVATE) {
    return {
      publicKey: process.env.PACT_ADMIN_PUBLIC,
      privateKey: process.env.PACT_ADMIN_PRIVATE,
    }
  }
  return pactLang.crypto.genKeyPair()
}

export function getUrl(): string {
  return process.env.PACT_URL || 'http://localhost:9444'
}
