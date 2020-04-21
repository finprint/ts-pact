/**
 * Script for executing a Pact file on a Pact node.
 *
 * Useful for deploying a contract or running a script.
 *
 * Usage: node runFile.js my-pact-script.pact
 */

import PactApi from '../pactApi'
import * as config from './config'

const LOCAL_MODE = '--local' in process.argv

const args = process.argv.slice(2);

if (args.length < 1 || args.length > 2) {
  console.error('Usage: node runFile.js my-pact-script.pact [--local]')
  process.exit(1)
}

const [codeFile] = args
const adminKeyPair = config.getAdminKeyPair()
const pactApi = new PactApi(config.getUrl())

const evalFn = (LOCAL_MODE ? pactApi.eval : pactApi.evalLocal).bind(pactApi)
evalFn({
  codeFile,
  keyPair: adminKeyPair,
}).then(console.log).catch(console.error)
