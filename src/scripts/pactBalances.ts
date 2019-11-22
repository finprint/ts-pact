/**
 * Get account balances, which may be zero or non-zero.
 */
export function betterGetBalances(accountIds: string[]) {
  const tryGetBalance = (accountId: string) => {
    return `(try 0.0 (coin.get-balance "${accountId}"))`
  }
  const queries = accountIds.map(tryGetBalance)
  return `[${queries.join(' ')}]`
}

/**
 * Get the balance for an account.
 */
export function pactGetBalance(accountId: string): string {
  return `(coin.get-balance "${accountId}")`
}
/**
 * Get the balances for multiple accounts.
 *
 * Requires that all accounts have non-zero balance.
 */
export function pactGetBalances(accountIds: string[]): string {
  const queries = accountIds.map(pactGetBalance)
  return `[${queries.join(' ')}]`
}

/**
 * Get the summed balance for a group of accounts.
 *
 * Requires that all accounts in the group have non-zero balance.
 */
export function pactGetBalanceGroup(accountIds: string[]): string {
  return `
    (fold
      (+)
      0
      (map
        (coin.get-balance)
        [
          ${accountIds.map(s => `"${s}"`).join(' ')}
        ]
      )
    )
  `
}

/**
 * Get the balances for a list of groups.
 *
 * Requires that all accounts in all groups have non-zero balance.
 */
export function pactGetBalanceGroups(groups: string[][]): string {
  const queries = groups.map(pactGetBalanceGroup)
  return `[${queries.join(' ')}]`
}
