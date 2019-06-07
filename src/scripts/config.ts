import pactLang from 'pact-lang-api'

import { IKeyPair } from '../types'

/**
 * Get the admin key pair from environmental variables, or default to a random key.
 */
export function getAdminKeyPair(): IKeyPair {
  if (process.env.PACT_ADMIN_PUBLIC && process.env.PACT_ADMIN_SECRET) {
    return {
      publicKey: process.env.PACT_ADMIN_PUBLIC,
      secretKey: process.env.PACT_ADMIN_SECRET,
    }
  }
  return pactLang.crypto.genKeyPair()
}

export function getUrl(): string {
  return process.env.PACT_URL || 'http://localhost:9444'
}
