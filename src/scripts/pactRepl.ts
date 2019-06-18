/**
 * Basic REPL for executing commands on a Pact node.
 */

import readline from 'readline'

import PactApi from '../pactApi'
import * as pactUtils from '../pactUtils'
import * as config from './config'

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
  const adminKeyPair = config.getAdminKeyPair()

  while (true) {
    const line = await prompt('> ')
    await pactApi.eval({
      code: line,
      keyPair: adminKeyPair,
      data: pactUtils.keysetData(adminKeyPair, 'my-keyset'),
    }).then(console.log).catch(console.error)
  }
}

main().catch(console.error)
