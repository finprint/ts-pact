import _ from 'lodash'

import PactApi from '../pactApi'
import * as pactUtils from '../pactUtils'

function url(chainId: number): string {
  return `https://us-e3.chainweb.com/chainweb/0.0/mainnet01/chain/${chainId}/pact`
}

const accounts: string[] = [
]

const numChains = 10
const throwawayKey = pactUtils.generateKeyPair()

const pactApis = _.map(_.range(numChains), (chainId: number) => {
  return new PactApi(url(chainId))
})

function code(accountId: string): string {
  return `(coin.get-balance "${accountId}")`
}

async function tryGetBalance(accountId: string, chainId: number): Promise<number> {
  try {
    const result = await pactApis[chainId].evalLocal({
      code: code(accountId),
      keyPair: throwawayKey,
    })
    process.stdout.write('.')
    return result as number
  } catch (error) {
    if (`${error}`.indexOf('row not found') === -1) {
      process.stdout.write('X')
      // console.error(`Unexpected error: ${error}`)
    } else {
      process.stdout.write('_')
    }
    return 0.0
  }
}


async function main(): Promise<void> {
  const balances: { [accountId: string]: number } = {}

  for (const accountId of accounts) {
    balances[accountId] = _.sum(await Promise.all(_.map(_.range(numChains), (chainId: number) => {
      return tryGetBalance(accountId, chainId)
    })))
    console.log()
  }

  console.log()
  for (const accountId of accounts) {
    console.log(`${accountId}: ${balances[accountId]}`)
  }
}

main().catch(console.error)
