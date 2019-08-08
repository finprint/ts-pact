/**
 * EXAMPLE SCRIPT.
 *
 * Modify this for your own contracts and deployments steps.
 */

import PactApi from '../pactApi'
import * as config from './config'

// Set up keys required to deploy and/or initialize the contract.
const adminKeysetName = 'admin-keyset' // Must match the name used in the contract.
const adminKeyPair = config.getAdminKeyPair()
const adminKeyData = JSON.stringify({ [adminKeysetName]: [adminKeyPair.publicKey.toString('hex')] })

/**
 * Helper function to load a contract using the admin keyset.
 */
async function loadContract(pactApi: PactApi, contractFilename: string): Promise<void> {
  const result = await pactApi.eval({
    codeFile: contractFilename,
    data: adminKeyData,
    keyPair: adminKeyPair,
  })
  console.log(`Deployed contract '${contractFilename}' with result: ${result}`)
}

async function main(): Promise<void> {
  const pactApi = new PactApi(config.getUrl())

  // Deploy contracts.
  await loadContract(pactApi, 'my-contract.pact')

  // Initialize contracts.
  let result = await pactApi.eval({
    code: '(my-contract.initialize)',
    data: adminKeyData,
    keyPair: adminKeyPair,
  })
  console.log(result)
}

main().catch(console.error)
