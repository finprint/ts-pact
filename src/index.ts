import pactLang from 'pact-lang-api'

import PactApi from './pactApi'
import * as pactUtils from './pactUtils'
import { IKeyPair } from './types'

function generateKeyPair(): IKeyPair {
  const { publicKey, secretKey } = pactLang.crypto.genKeyPair()
  return {
    publicKey,
    privateKey: secretKey,
  }
}

export {
  IKeyPair,
  PactApi,
  generateKeyPair,
  pactUtils,
}
