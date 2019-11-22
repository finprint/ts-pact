import _ from 'lodash'

import PactApi from '../pactApi'
import * as pactUtils from '../pactUtils'
import { betterGetBalances } from './pactBalances'

// import { Account, AccountGroupAndStatus, AccountGroups, accounts, accountGroups } from './accounts'
import { accounts } from './accounts2'

const miningReward = 2.304523
const numChains = 10
const throwawayKey = pactUtils.generateKeyPair()

// CLI args.
// const accountArgs: string[] = []
// let getUnminedChains = false
// let verbose = false
// for (const arg of process.argv.slice(2)) {
//   if (arg === '-b') {
//     getUnminedChains = true
//   } else if (arg === '-v') {
//     verbose = true
//   } else {
//     accountArgs.push(arg)
//   }
// }
const accountArgs = process.argv.slice(2)

// const pactApis = _.map(_.range(numChains), (chainId: number) => {
//   return new PactApi(url(chainId))
// })

function url(chainId: number): string {
  return `https://us-w3.chainweb.com/chainweb/0.0/mainnet01/chain/${chainId}/pact`
}

async function getBalances(accountIds: string[]): Promise<number[][]> {
  return Promise.all(_.map(_.range(numChains), async chainId => {
    const pactApi = new PactApi(url(chainId))
    const code = betterGetBalances(accountIds)
    return pactApi.evalLocal({
      code,
      keyPair: throwawayKey,
    }) as unknown as number[]
  }))
}

// async function tryGetBalance(accountId: string, chainId: number): Promise<number> {
//   try {
//     const result = await pactApis[chainId].evalLocal({
//       code: pactGetBalance(accountId),
//       keyPair: throwawayKey,
//     })
//     if (verbose) process.stdout.write('.')
//     return result as number
//   } catch (error) {
//     if (`${error}`.indexOf('row not found') === -1) {
//       if (verbose) process.stdout.write('X')
//       if (verbose) console.error(`Unexpected error: ${error}`)
//     } else {
//       if (verbose) process.stdout.write('_')
//     }
//     return 0.0
//   }
// }

// async function processGroup(groupAndStatus: AccountGroupAndStatus, chainId: number): Promise<number> {
//   const group = groupAndStatus[0] as Account[]
//   const active = groupAndStatus[1] as boolean

//   const asIndividuals: string[] = []
//   const asGroup: string[] = []
//   for (const pair of group) {
//     const accountId = pair[0] as string
//     const unminedChains = pair[1] as number[]
//     if (unminedChains.indexOf(chainId) === -1) {
//       asGroup.push(accountId)
//     } else {
//       asIndividuals.push(accountId)
//     }
//   }

//   let totalCoins = await tryGetBalanceGroup(asGroup, chainId)

//   // Only query individual accounts if there's a chance the balance changed from zero to non-zero.
//   if (active) {
//     totalCoins += _.sum(await Promise.all(_.map(asIndividuals, (accountId: string) => {
//       return tryGetBalance(accountId, chainId)
//     })))
//   }

//   return totalCoins
// }

// async function tryGetBalanceGroup(accountIds: string[], chainId: number): Promise<number> {
//   try {
//     const result = await pactApis[chainId].evalLocal({
//       code: pactGetBalanceGroup(accountIds),
//       keyPair: throwawayKey,
//     })
//     if (verbose) process.stdout.write('.')
//     return result as number
//   } catch (error) {
//     if (verbose) process.stdout.write('X')
//     if (verbose) console.error(`Unexpected error: ${error}`)
//     return 0.0
//   }
// }

function toRewards(numCoins: number): number {
  return Math.round(numCoins / miningReward)
}

// async function asyncSumChains(fn: (chainId: number) => Promise<number>): Promise<number> {
//   return _.sum(await Promise.all(_.map(_.range(numChains), fn)))
// }

// async function printUnminedChains(group: Account[]) {
//   const failMap: { [label: string]: number[] } = {}
//   for (const pair of group) {
//     const accountId: string = pair[0] as string
//     failMap[accountId] = []
//     await asyncSumChains(async (chainId: number) => {
//       if (await tryGetBalance(accountId, chainId) === 0) {
//         failMap[accountId].push(chainId)
//       }
//       return 0
//     })
//   }
//   _.each(failMap, (failedChainIds, label) => {
//     console.log(`['${label}', [${failedChainIds.join(', ')}]]`)
//   })
// }

async function main(): Promise<void> {
  // Balances in number of rewards.
  // Roughly think of this as dollars? Price of 50¢/coin discounted a little.
  // const balances: { [accountId: string]: number } = {}
  // let accountsToQuery: Account[] = []
  // let groupsToQuery: AccountGroups = {}

  // Use CLI args as group labels or account IDs, if provided.
  // if (accountArgs.length > 0) {
  //   for (const label of accountArgs) {
  //     if (label in accountGroups) {
  //       groupsToQuery[label] = accountGroups[label]
  //     } else {
  //       accountsToQuery.push([label, []])
  //     }
  //   }
  // } else {
  //   accountsToQuery = accounts
  //   groupsToQuery = accountGroups
  // }

  let accountsToQuery = accounts
  if (accountArgs.length > 0) {
    accountsToQuery = _.reduce(
      accountArgs,
      (acc, accountId) => ({ ...acc, [accountId]: true}),
      accountsToQuery,
    )
  }

  const pairs = _.toPairs(accountsToQuery)
  const balancesByChain = await getBalances(pairs.map(pair => pair[0]))

  // Print 2-d data.
  // for (const i in pairs) {
  //   const accountId = pairs[i][0]
  //   const rewards = _.map(_.range(numChains), chainId => toRewards(balancesByChain[chainId][i]))
  //   console.log(`${accountId},${rewards.join(',')}`)
  // }

  const activeAccounts = []
  for (const i in pairs) {
    const [accountId, active] = pairs[i]
    if (active) {
      activeAccounts.push(accountId)
    }
  }

  const activeBalances = new Array(activeAccounts.length).fill(0)
  let inactiveBalance = 0

  for (const chainId in balancesByChain) {
    const balances = balancesByChain[chainId]
    let j = 0
    for (const i in pairs) {
      const active = pairs[i][1]
      const balance = balances[i]
      if (active) {
        activeBalances[j] += balance
        j++
      } else {
        inactiveBalance += balance
      }
    }
  }

  // console.log(`(inactive),${toRewards(inactiveBalance)}`)
  console.log(`${toRewards(inactiveBalance)}`)
  for (const j in activeAccounts) {
    // console.log(`${activeAccounts[j]},${toRewards(activeBalances[j])}`)
    console.log(`${toRewards(activeBalances[j])}`)
  }

  // if (getUnminedChains) {
  //   _.each(groupsToQuery, async groupAndStatus => await printUnminedChains(groupAndStatus[0] as Account[]))
  //   await printUnminedChains(accountsToQuery)
  //   return
  // }

  // // Asynchronously query all balances.
  // await Promise.all([
  //   Promise.all(_.map(accountsToQuery, async ([accountId_, _unminedChains]) => {
  //     const accountId = accountId_ as string
  //     balances[accountId] = await asyncSumChains((chainId: number) => tryGetBalance(accountId, chainId))
  //   })),
  //   Promise.all(_.map(groupsToQuery, async (accountGroupAndStatus, label) => {
  //     balances[label] = await asyncSumChains((chainId: number) => processGroup(accountGroupAndStatus, chainId))
  //   })),
  // ])

  // // Print the balances.
  // console.log()
  // _.each(balances, (balance, label) => {
  //   console.log(`${label},${toRewards(balance)}`)
  // })
}

main().catch(console.error)
