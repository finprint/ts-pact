// TODO: Support keysets other than just a single key.
export class Keyset {
  name: string
  publicKey: string
  constructor(name: string, publicKey: string) {
    this.name = name
    this.publicKey = publicKey
  }
}

export class PactExpr {
  expr: string
  constructor(expr: string) {
    this.expr = expr
  }
}

export function keysetData(name: string, publicKey: string) {
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
