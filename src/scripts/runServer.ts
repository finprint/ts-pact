/**
 * Just run a test server.
 *
 * Always runs with persistence disabled.
 */

import PactServer from '../pactServer'
import * as config from './config'

const server = new PactServer(config.DEFAULT_PORT)
server.start({ quiet: false })
  .then(() => {
    console.log(`Server started at ${config.getUrl()}`)
  })
  .catch(console.error)
