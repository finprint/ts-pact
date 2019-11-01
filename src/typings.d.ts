declare module 'pact-lang-api' {
  interface KeyPair {
    publicKey: string,
    secretKey: string,
  }

  interface LocalRequest {
    hash: string
    sigs: {}[]
    cmd: string
  }

  interface SendRequest {
    cmds: LocalRequest[]
  }

  var crypto: {
    genKeyPair: () => KeyPair
  }

  var simple: {
    exec: {
      createCommand: (keyPair: KeyPair, nonce: string, code: string, data: {}, meta: {}) => SendRequest
      createLocalCommand: (keyPair: KeyPair, nonce: string, code: string, data: {}, meta: {}) => LocalRequest
      createListenRequest: (sendRequest: SendRequest) => { requestKey: string }
    }
  }
}
