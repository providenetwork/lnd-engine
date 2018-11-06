const path = require('path')
const { expect, rewire, sinon } = require('test/test-helper')

const generateLightningClient = rewire(path.resolve('src', 'lnd-setup', 'generate-lightning-client'))

describe.only('generateLightningClient', () => {
  const host = 'host'
  const protoPath = 'protopath'
  const tlsCertPath = 'tlscertpath'
  const macaroonPath = 'macaroonpath'

  let loggerStub
  let engineStub
  let loadProtoStub
  let lnrpcStub
  let metaDataStub
  let existsSyncStub

  beforeEach(() => {
    loggerStub = {
      warn: sinon.stub(),
      info: sinon.stub(),
      error: sinon.stub()
    }
    engineStub = {
      host,
      protoPath,
      tlsCertPath,
      macaroonPath,
      logger: loggerStub
    }
    lnrpcStub = sinon.stub().returns({ lnrpc: {} })
    loadProtoStub = sinon.stub().returns(lnrpcStub)
    metaDataStub = sinon.stub()
    metaDataStub.prototype.add = sinon.stub()
    existsSyncStub = sinon.stub().returns(true)
    existsSyncStub.withArgs(tlsCertPath)

    generateLightningClient.__set__('loadProto', loadProtoStub)
    generateLightningClient.__set__('fs', {
      existsSync: existsSyncStub,
      readFileSync: sinon.stub().returns({})
    })
    generateLightningClient.__set__('grpc', {
      Metadata: metaDataStub,
      credentials: {
        createFromMetadataGenerator: sinon.stub(),
        createSsl: sinon.stub(),
        combineChannelCredentials: sinon.stub()
      }
    })
  })

  it('loads a proto file', () => {
    generateLightningClient(engineStub)
    expect(loadProtoStub).to.have.been.calledWith(protoPath)
  })

  it('errors if a tls cert is not on disk', () => {
    existsSyncStub.withArgs(tlsCertPath).returns(false)
    expect(() => generateLightningClient(engineStub)).to.throw('LND-ENGINE error - tls cert file not found')
  })

  it('creates macaroon metadata', () => {

  })

  it('creates tls credentials', () => {

  })

  it('combines tls and macaroon credentials', () => {

  })

  it('creates a new lightning rpc client', () => {

  })

  context('daemon is not initializaed', () => {
    it('logs a failure', () => {})
    it('returns null', () => {})
  })

  context('macaroon not found', () => {
    it('logs a warning if macaroon was not found', () => {})
    it('it returns ssl credentials', () => {})
  })
})
