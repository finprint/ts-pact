import PactApi from './pactApi'
import * as pactUtils from './pactUtils'
import { IKeyPair } from './types'

const generateKeyPair = pactUtils.generateKeyPair

export {
  IKeyPair,
  PactApi,
  generateKeyPair,
  pactUtils,
}
