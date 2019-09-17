import { chomp, chunksToLinesAsync } from '@rauschma/stringio'
import { ChildProcess, ExecOptions, spawn } from 'child_process'
import fs from 'fs'
import _ from 'lodash'
import net from 'net'
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

type LogCallback = (line: string) => void | Promise<void>

export interface PactServerOptions {
  /**
   * Called on lines sent to stdout or stderr for SERVER_STARTUP_TIMEOUT_MS after calling start().
   */
  onStartupLogLine?: LogCallback,

  /**
   * Called on every stdout line, including during startup.
   */
  onStdoutLine?: LogCallback,

  /**
   * Called on every stderr line, including during startup.
   */
  onStderrLine?: LogCallback,

  /**
   * If false, will apply default loggers for stdout and stderr.
   */
  quiet?: boolean,
}

/**
 * Wrapper for using Node child processes and handling output.
 */
class Process {
  private readonly path: string
  private readonly args: string[]
  private readonly options: ExecOptions
  private readonly stdoutCallbacks: LogCallback[] = []
  private readonly stderrCallbacks: LogCallback[] = []
  private childProcess?: ChildProcess
  private _onExitPromise?: Promise<void>
  private _started = false

  constructor(path: string, args: string[], options: ExecOptions = {}) {
    this.path = path
    this.args = args
    this.options = _.defaults({
      stdio: ['ignore', 'pipe', 'pipe'],
    }, options)
  }

  get started(): boolean {
    return this._started
  }

  get onExitPromise(): Promise<void> {
    if (!this._started) {
      throw new Error('Process not yet started.')
    }
    return this._onExitPromise!
  }

  start(): void {
    if (this._started) {
      throw new Error('Process already started.')
    }
    this._started = true
    this.childProcess = spawn(this.path, this.args, this.options)

    setImmediate(async () => {
      for await (const line of chunksToLinesAsync(this.childProcess!.stdout as AsyncIterable<string>)) {
        await Promise.all(_.map(this.stdoutCallbacks, async (callback: LogCallback) => { await callback(chomp(line)) }))
      }
    })

    setImmediate(async () => {
      for await (const line of chunksToLinesAsync(this.childProcess!.stderr as AsyncIterable<string>)) {
        await Promise.all(_.map(this.stderrCallbacks, async (callback: LogCallback) => { await callback(chomp(line)) }))
      }
    })

    this._onExitPromise = new Promise((resolve, reject) => {
      this.childProcess!.once('exit', (code: number, _signal: string) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`Process exited with error code: ${code}`))
        }
      })
      this.childProcess!.once('error', (error: Error) => {
        reject(error)
      })
    })
  }

  kill(): void {
    if (!this.childProcess) {
      throw new Error('Process was not started.')
    }
    this.childProcess.kill()
  }

  addStdoutCallback(callback: LogCallback) {
    this.stdoutCallbacks.push(callback)
  }

  addStderrCallback(callback: LogCallback) {
    this.stderrCallbacks.push(callback)
  }

  removeStdoutCallback(callback: LogCallback) {
    const index = this.stdoutCallbacks.indexOf(callback)
    if (index !== -1) {
      this.stdoutCallbacks.splice(index, 1)
    }
  }

  removeStderrCallback(callback: LogCallback) {
    const index = this.stderrCallbacks.indexOf(callback)
    if (index !== -1) {
      this.stderrCallbacks.splice(index, 1)
    }
  }
}

/**
 * Run a server in IPv4 mode.
 *
 * We use this to address an issue where two Pact servers can run at once on the same port,
 * one with IPv4 and one with IPv6. Before starting the Pact server, we run a server on the same
 * port with IPv4 to trick Pact into using IPv6. We want PactServer.start() to fail if the port
 * was already occupied on either IPv4 or IPv6.
 *
 * See e.g. this comment for some discussion on interactions between IPv4 and IPv6 sockets:
 * https://github.com/processone/ejabberd/issues/984#issuecomment-238523530
 */
class TempServer {
  private server?: net.Server

  async start(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = net.createServer()
      this.server.once('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          throw new Error(`Cannot start Pact server since port ${port} is already in use.`)
        }
        reject(error)
      })
      this.server.once('listening', () => {
        resolve()
      })
      this.server.listen(port, '0.0.0.0')
    })
  }

  stop(): void {
    if (!this.server) {
      throw new Error('Server was not started.')
    }
    this.server.close()
  }
}

export default class PactServer {
  port: number
  started: boolean

  constructor(port: number) {
    this.port = port
    this.started = false
  }

  /**
   * The localhost URL that the server is running on or will run on.
   */
  get url(): string {
    return `http://localhost:${this.port}`
  }

  /**
   * Run the Pact server in the background.
   *
   * Wait for the server to finish starting up before resolving, and reject if startup failed.
   */
  async start(serverOptions: PactServerOptions = {}): Promise<void> {
    if (this.started) {
      throw new Error('PactServer was already started.')
    }
    this.started = true

    const options = _.clone(serverOptions)
    if (options.quiet === false) {
      _.defaults(options, {
        onStdoutLine: console.log,
        onStderrLine: console.error,
      })
    }

    const workingDir = tmp.dirSync().name
    const serverConfigFile = `${workingDir}/server.conf`
    const serverHttpLogDir = `${workingDir}/log/`

    // Write server configuration to a file.
    const serverConfig = {
      port: this.port,
      logDir: serverHttpLogDir,
      persistDir: '', // Disable persistence.
      pragmas: '[]',
      verbose: 'true',
    }
    const serverConfigYaml = _.map(serverConfig, (value, key) => `${key}: ${value}`).join('\n')
    await writeFile(serverConfigFile, serverConfigYaml)

    // Start a server on the same port to trick Pact into using IPv6. See TempServer for details.
    const tempServer = new TempServer()
    await tempServer.start(this.port)

    // Start up the Pact server.
    try {
      await new Promise(async (resolve, reject) => {
        const pactProcess = new Process('pact', ['--serve', serverConfigFile], { cwd: workingDir })

        if (options.onStdoutLine) {
          pactProcess.addStdoutCallback(options.onStdoutLine)
        }

        if (options.onStderrLine) {
          pactProcess.addStderrCallback(options.onStderrLine)
        }

        // Handle startup logs.
        //
        // Conisder startup to have finished once we have seen all the log lines we expect.
        const expectedStartupLines = new Set(SERVER_STARTUP_SUCCESS_LINES)
        const startupLogCallback = async (line: string) => {
          if (options.onStartupLogLine) {
            await options.onStartupLogLine(line)
          }
          for (const failureLine of SERVER_STARTUP_FAILURE_LINES) {
            if (line.includes(failureLine)) {
              reject(new Error(`Pact server reported failure: '${line}'. Aborting.`))
            }
          }
          const seenLines = new Set<string>()
          for (const successLine of expectedStartupLines) {
            if (line.includes(successLine)) {
              seenLines.add(successLine)
            }
          }
          for (const seenLine of seenLines) {
            expectedStartupLines.delete(seenLine)
          }
          if (expectedStartupLines.size === 0) {
            resolve()
          }
        }
        pactProcess.addStdoutCallback(startupLogCallback)
        pactProcess.addStderrCallback(startupLogCallback)

        pactProcess.start()
        process.on('exit', () => { pactProcess.kill() })
        pactProcess.onExitPromise.catch(reject)

        setTimeout(() => {
          reject(new Error(
            'Startup timed out. Did not find expected line(s) ' +
            `'${[...expectedStartupLines].join(',')}' ` +
            'in Pact server logs. Aborting.'
          ))
        }, SERVER_STARTUP_TIMEOUT_MS)
      })
    } catch (error) {
      throw error
    } finally {
      tempServer.stop()
    }
  }
}
