# ts-pact

TypeScript library for running and deploying Pact code.

## Getting started

Download the latest version of Pact. See the
[Pact README](https://github.com/kadena-io/pact/#installing-pact-with-homebrew-osx-only)
for instructions.

## Usage

```typescript
import pactLang from 'pact-lang-api'
import PactApi, { IKeyPair, pactUtils } from 'ts-pact'

const keyPair = pactLang.crypto.genKeyPair()
const args = [
  keyPair.publicKey, // Use public key as the account ID.
  pactUtils.keyset('account-keyset'),
]
const code = pactUtils.makeExpr('accounts.create-account', args)
const data = pactUtils.keysetData(keyPair.publicKey, 'account-keyset')
return this.pactApi.eval({
  code,
  data,
  keyPair,
})
```

## Running scripts

This package comes with some utility scripts in `src/scripts/`.
The scripts will look in the environmental variables for a Pact key and URL
to use when sending transactions, falling back to defaults if these are not available.
See `src/scripts/config.ts` for details.

Compile scripts:

```
yarn compile
```

Open a REPL to a Pact node:

```
node dist/src/scripts/pactRepl.js
```

Deploy a contract or run a Pact script:

```
node dist/src/scripts/runFile.js
```

Example: deploy and initialize a set of smart contracts:

```
node dist/src/scripts/deployContracts.js
```
