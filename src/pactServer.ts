import childProcess, { ChildProcess, ExecOptions } from 'child_process'
import fs from 'fs'
import _ from 'lodash'
import process from 'process'
import tmp from 'tmp'
import util from 'util'

const writeFile = util.promisify(fs.writeFile)

const SERVER_STARTUP_TIMEOUT_MS = 2000

// Log lines that we expect to see when the Pact server starts up successfully.
const SERVER_STARTUP_SUCCESS_LINES = [
  'No replay found',
  'starting on port',
]

// Log lines that indicate a failure on start up.
const SERVER_STARTUP_FAILURE_LINES = [
  'Address already in use',
]

export interface Killable {
  kill: () => void
}

/**
 * Helper function for executing a subprocess.
 *
 * Returns the ChildProcess object and a promise for the results of the subprocess.
 */
function spawn(args: string[], outFile: string, options: ExecOptions = {}): [Killable, Promise<string>] {
  const cmd: string = args.concat([`>${outFile}`]).join(' ')

  let child: ChildProcess
  const resultPromise = new Promise<string>((resolve, reject) => {
    child = childProcess.exec(cmd, options, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`${args[0]} exited with non-zero exit code ${error.code}.\nstderr: ${stderr}`))
      }
      resolve(stdout)
    })
  })

  const processWrapper = {
    kill: () => {
      // The spawned process runs in a shell, so in addition to killing the shell, we have to
      // add one to the pid to get the process itself.
      // See e.g. https://github.com/nodejs/node/issues/2098
      // I haven't found a cleaner way to handle this.
      process.kill(child.pid)
      process.kill(child.pid + 1)
    }
  }
  return [processWrapper, resultPromise]
}

export default class PactServer {
  private _killable?: Killable
  private _url?: string
  port: number
  started: boolean

  constructor(port: number) {
    this.port = port
    this.started = false
  }

  /**
   * The localhost URL that the server is running on.
   *
   * Should succeed if called after awaiting start().
   */
  get url(): string {
    if (this._url) {
      return this._url
    } else {
      throw new Error('PactServer did not finish starting up.')
    }
  }

  /**
   * Run the Pact server in the background.
   *
   * Wait for the server to finish starting up before resolving and reject if start-up failed.
   */
  async start(onStartupLogs?: (logLines: string) => void): Promise<void> {
    if (this.started) {
      throw new Error('PactServer was already started.')
    }
    this.started = true

    const serverConfigFile = tmp.fileSync().name
    const serverLog = tmp.fileSync().name
    const workingDir = tmp.dirSync().name
    const serverHttpLog = `${workingDir}/log`

    // Write server configuration to a file.
    const serverConfig = {
      port: this.port,
      logDir: serverHttpLog,
      persistDir: '', // Disable persistence.
      pragmas: '[]',
      verbose: 'true',
    }
    const serverConfigYaml = _.map(serverConfig, (value, key) => {
      return `${key}: ${value}`
    }).join('\n')
    await writeFile(serverConfigFile, serverConfigYaml)

    return new Promise((resolve, reject) => {
      const [process, result] = spawn(['pact', '--serve', serverConfigFile], serverLog, { cwd: workingDir })

      result.catch((error) => {
        reject(error)
      })

      setTimeout(() => {
        const startupLogsBuffer = fs.readFileSync(serverLog)

        // Maybe print or do something with the startup logs.
        if (onStartupLogs) {
          onStartupLogs(startupLogsBuffer.toString())
        }

        for (const line of SERVER_STARTUP_SUCCESS_LINES) {
          if (startupLogsBuffer.indexOf(line) === -1) {
            process.kill()
            reject(new Error(`Did not find expected output '${line}' in Pact server logs. Aborting.`))
          }
        }

        for (const line of SERVER_STARTUP_FAILURE_LINES) {
          if (startupLogsBuffer.indexOf(line) !== -1) {
            process.kill()
            reject(new Error(`Pact server reported failure: '${line}'. Aborting.`))
          }
        }

        this._url = `http://localhost:${this.port}`
        this._killable = process
        resolve()
      }, SERVER_STARTUP_TIMEOUT_MS)
    })
  }

  /**
   * Send SIGTERM to the Pact server processes.
   *
   * Should succeed if called after awaiting start().
   */
  stop(): void {
    if (this._killable) {
      this._killable.kill()
    } else {
      throw new Error('PactServer did not finish starting up.')
    }
  }
}
