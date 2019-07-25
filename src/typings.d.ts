interface KeyPair {
  publicKey: string,
  secretKey: string,
}

interface SendRequest {
  cmds: {
    hash: string
    sigs: {}[]
    cmd: string
  }[]
}

declare module 'pact-lang-api' {
  var crypto: {
    genKeyPair: () => KeyPair
  }

  var simple: {
    exec: {
      createCommand: (keyPair: KeyPair, nonce: string, code: string, data: {}, meta: {}) => SendRequest
      createListenRequest: (sendRequest: SendRequest) => { requestKey: string }
    }
  }
}
