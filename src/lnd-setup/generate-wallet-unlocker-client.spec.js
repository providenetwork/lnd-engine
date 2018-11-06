const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const generateWalletUnlockerClient = rewire(path.resolve('src', 'lnd-setup', 'generate-lightning-client'))

describe.only('generateLightningClient', () => {
  const host = 'host'
  const protoPath = 'protopath'
  const tlsCertPath = 'tlscert'

  let engine
  let loadProtoStub
  let lnrpcProto
  let loggerErrorStub
  let logger
  let readFileSyncStub
  let existsSyncStub
  let tlsCert

  beforeEach(() => {
    tlsCert = Buffer.from('cert')
    loggerErrorStub = sinon.stub()
    logger = {
      error: loggerErrorStub
    }
    engine = {
      host,
      protoPath,
      tlsCertPath,
      logger
    }
    lnrpcProto = sinon.stub()
    loadProtoStub = sinon.stub().returns({
      lnrpc: {
        WalletUnlocker: lnrpcProto
      }
    })
    readFileSyncStub = sinon.stub().returns(tlsCert)
    existsSyncStub = sinon.stub().returns(true)

    generateWalletUnlockerClient.__set__('loadProto', loadProtoStub)
    generateWalletUnlockerClient.__set__('fs', {
      readFileSync: readFileSyncStub,
      existsSync: existsSyncStub
    })
  })

  it('loads a proto file from protoPath', () => {
    generateWalletUnlockerClient(engine)
    expect(loadProtoStub).to.have.been.calledWith(protoPath)
  })

  it('throws an error if tls cert is not found', () => {
    existsSyncStub.returns(false)
    expect(() => generateWalletUnlockerClient(engine)).to.throw('tls cert file not found')
  })

  it('reads a tls file')
  it('creates tls credentials')
  it('returns a new WalletUnlocker rpc')

  context('daemon is already initialized', () => {
    it('returns null')
    it('loads an error')
  })
})
