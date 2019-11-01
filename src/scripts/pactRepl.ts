/**
 * Basic REPL for executing commands on a Pact node.
 */

import readline from 'readline'

import PactApi from '../pactApi'
import * as pactUtils from '../pactUtils'
import * as config from './config'

const LOCAL_MODE = '--local' in process.argv

async function prompt(message: string): Promise<string> {
  const reader = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  return new Promise(resolve => {
    reader.question(message, (answer: string) => {
      reader.close()
      resolve(answer)
    })
  })
}

async function main(): Promise<void> {
  const pactApi = new PactApi(config.getUrl())
  const evalFn = (LOCAL_MODE ? pactApi.eval : pactApi.evalLocal).bind(pactApi)
  const adminKeyPair = config.getAdminKeyPair()

  while (true) {
    const line = await prompt('> ')
    await evalFn({
      code: line,
      keyPair: adminKeyPair,
      data: pactUtils.keysetData(adminKeyPair.publicKey, 'my-keyset'),
    }).then(console.log).catch(console.error)
  }
}

main().catch(console.error)
