import pactLang from 'pact-lang-api'

import { IKeyPair } from './types'

// TODO: Support keysets other than just a single key.
export class Keyset {
  publicKey: string
  name: string
  constructor(publicKey: string, name: string = publicKey) {
    this.publicKey = publicKey
    this.name = name
  }
}

export class PactExpr {
  expr: string
  constructor(expr: string) {
    this.expr = expr
  }
}

export function generateKeyPair(): IKeyPair {
  const { publicKey, secretKey } = pactLang.crypto.genKeyPair()
  return {
    publicKey,
    privateKey: secretKey,
  }
}

export function keysetData(publicKey: string, name: string) {
  return { [name]: [publicKey] }
}

/**
 * Similar to `mkExpr()` from `pact-lang-api` but with support for nested expressions and keysets.
 */
export function makeExprAndData(functionName: string, args: {}[]): [string, {}] {
  const data: {[name: string]: {}} = {}
  const argsString = args.map(x => {
    if (x instanceof Keyset) {
      data[x.name] = [x.publicKey]
      return `(read-keyset "${x.name}")`
    } else if (x instanceof PactExpr) {
      return x.expr
    } else if (x instanceof String) {
      return `"${x}"`
    }
    return JSON.stringify(x)
  }).join(' ')
  return [`(${functionName} ${argsString})`, data]
}

export function makeExpr(functionName: string, args: {}[]): string {
  return makeExprAndData(functionName, args)[0]
}
