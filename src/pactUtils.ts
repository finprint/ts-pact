import { IKeyPair } from './types'

export class PactExpr {
  public expr: string
  constructor(expr: string) {
    this.expr = expr
  }
}

export function keyset(name: string): PactExpr {
  return new PactExpr(`(read-keyset "${name}")`)
}

export function keysetData(keyPair: IKeyPair, name: string): {} {
  return {
    [name]: [keyPair.publicKey],
  }
}

/**
 * Similar to `mkExpr()` from `pact-lang-api` but with support for nested expressions.
 */
export function makeExpr(functionName: string, args: {}[]): string {
  const argsString = args.map(x => {
    if (x instanceof PactExpr) {
      return x.expr
    } else if (x instanceof String) {
      return `"${x}"`
    }
    return JSON.stringify(x)
  }).join(' ')
  return `(${functionName} ${argsString})`
}
