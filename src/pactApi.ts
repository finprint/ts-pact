/**
 * Wrapper for making API calls to a Pact node.
 */

import fs from 'fs'
import pact from 'pact-lang-api'
import axios, { AxiosRequestConfig } from 'axios'

import { IKeyPair } from './types'

export interface ISendOptions {
  code?: string
  codeFile?: string
  data?: {}
  dataFile?: string
  nonce?: string
  keyPair: IKeyPair
}

// The request format expected by the /send endpoint.
export interface ISendRequest {
  cmds: {
    hash: string
    sigs: {}[]
    cmd: string
  }[]
}

// The response format returned by the /send endpoint.
export interface ISendResponse {
  requestKeys: string[]
}

// The request format expected by the /listen endpoint.
export interface IListenRequest {
  listen: string
}

// The response format returned by the /listen endpoint.
export interface IListenResult {
  result: {
    status: string
    data?: {}
    error?: {
      callStack: []
      type: string
      message: string
      info: string
    }
  }
  metaData: {}
  txId: number
}

// Example meta object. Currently we just send this with every transaction.
const META = {
  chainId: '16',
  gasPrice: 1,
  gasLimit: 100000,
  sender: 'someSender',
}

function generateNonce(): string {
  return Math.random().toString(36).substring(7);
}

function loadFile(fileName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    fs.readFile(fileName, 'utf8', (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(data)
      }
    })
  })
}

export default class PactApi {
  readonly baseUrl: string
  requestTimeoutMs: number = 0

  constructor(host: string) {
    this.baseUrl = `${host}/api/v1`
  }

  /**
   * Send an HTTP POST and handle Axios errors.
   */
  async _post(endpoint: string, payload: {}) {
    try {
      const requestConfig: AxiosRequestConfig = {
        timeout: this.requestTimeoutMs,
      }
      const response = await axios.post(`${this.baseUrl}${endpoint}`, payload, requestConfig)
      return response.data
    } catch (error) {
      if (error.response) {
        throw new Error(
          `Pact server responded to ${endpoint} with status ` +
          `${error.response.status}: ${error.response.statusText}`
        )
      } else if (error.request) {
        throw new Error(`No response from the Pact server: ${error.message}`)
      } else {
        throw new Error(`Problem setting up request to the Pact server: ${error.message}`)
      }
    }
  }

  async createSend(options: ISendOptions): Promise<ISendRequest> {
    const nonce = options.nonce || generateNonce()
    const code: string = (options.codeFile ? await loadFile(options.codeFile) : options.code) || ''
    const data: {} = (options.dataFile ? JSON.parse(await loadFile(options.dataFile)) : options.data) || {}
    const keyPair = {
      publicKey: options.keyPair.publicKey.toString('hex'),
      secretKey: options.keyPair.privateKey.toString('hex'),
    }
    return pact.simple.exec.createCommand(
      keyPair,
      nonce,
      code,
      data,
      META,
    )
  }

  createListen(sendRequest: ISendRequest): IListenRequest {
    const { requestKey } = pact.simple.exec.createListenRequest(sendRequest)
    return { listen: requestKey }
  }

  async send(sendRequest: ISendRequest): Promise<ISendResponse> {
    return this._post('/send', sendRequest)
  }

  async listen(listenRequest: IListenRequest): Promise<IListenResult> {
    return this._post('/listen', listenRequest)
  }

  /**
   * Send and listen.
   */
  async eval(options: ISendOptions): Promise<{}> {
    const sendRequest = await this.createSend(options)
    await this.send(sendRequest)
    const listenRequest = this.createListen(sendRequest)
    const { result } = await this.listen(listenRequest)
    if (result.status === 'failure') {
      throw new Error(`Pact eval failed with error: ${result.error!.message} - ${result.error!.info}`)
    } else if (result.status !== 'success') {
      throw new Error(`Pact eval failed with unknown status: '${result.status}'`)
    }
    return result.data!
  }
}
