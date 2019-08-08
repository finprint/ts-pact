import * as pactUtils from '../pactUtils'
import { IKeyPair } from '../types'

/**
 * Get the admin key pair from environmental variables, or default to a random key.
 */
export function getAdminKeyPair(): IKeyPair {
  if (process.env.PACT_ADMIN_PUBLIC && process.env.PACT_ADMIN_PRIVATE) {
    return {
      publicKey: Buffer.from(process.env.PACT_ADMIN_PUBLIC, 'hex'),
      privateKey: Buffer.from(process.env.PACT_ADMIN_PRIVATE, 'hex'),
    }
  }
  return pactUtils.generateKeyPair()
}

export function getUrl(): string {
  return process.env.PACT_URL || 'http://localhost:9444'
}
