import pactLang from 'pact-lang-api'

import PactApi from './pactApi'
import * as pactUtils from './pactUtils'
import { IKeyPair } from './types'

function generateKeyPair(): IKeyPair {
  return pactLang.crypto.genKeyPair()
}

export {
  IKeyPair,
  PactApi,
  generateKeyPair,
  pactUtils,
}
