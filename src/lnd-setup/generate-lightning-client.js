
/**
 * Lnd Lightning Client Module
 * @module src/lnd-setup/generate-lightning0-client
 */

const grpc = require('grpc')
const loadProto = require('../utils/load-proto')
const fs = require('fs')

/**
 * Generates a lnrpc.Lightning client which allows full functionality of the LND node
 *
 * @function
 * @param {LndEngine} - engine
 * @param {String} engine.host
 * @param {String} engine.protoPath
 * @param {String} engine.tlsCertPath
 * @param {String} engine.macaroonPath
 * @param {Logger} engine.logger
 * @returns {grpc.Client} lnrpc Lightning client definition
 * @returns {null}
 */
function generateLightningClient ({ host, protoPath, tlsCertPath, macaroonPath, logger }) {
  const { lnrpc } = loadProto(protoPath)

  const macaroonExists = fs.existsSync(macaroonPath)

  // We require all communication to be done via TLS, if there is no cert available,
  // we will throw
  if (!fs.existsSync(tlsCertPath)) {
    throw new Error(`LND-ENGINE error - tls cert file not found at path: ${tlsCertPath}`)
  }

  const tls = fs.readFileSync(tlsCertPath)

  // We do not require a macaroon to be available to use the lnd-engine, as the user
  // may have used the configuration `--no-macaroons` for testing.
  //
  // We set the macaroon to a blank string if it does not exists here because there
  // is a chance the macaroon hasn't been created.
  //
  // A macaroon will not be created if:
  // 1. An LND wallet hasn't been initialized
  // 2. The daemon/docker has messed up
  //
  // We can return early w/ only tls if the macaroon does not exist
  if (!macaroonExists) {
    logger.warn(`LND-ENGINE warning - macaroon path not found at path: ${macaroonPath}`)
    return grpc.credentials.createSsl(tls)
  }

  const macaroon = fs.readFileSync(macaroonPath)
  const metadata = new grpc.Metadata()
  metadata.add('macaroon', macaroon.toString('hex'))
  const macaroonCredentials = grpc.credentials.createFromMetadataGenerator((_, cb) => cb(null, metadata))

  const sslCredentials = grpc.credentials.createSsl(tls)
  const rpcCredentials = grpc.credentials.combineChannelCredentials(sslCredentials, macaroonCredentials)

  try {
    return new lnrpc.Lightning(host, rpcCredentials, {})
  } catch (e) {
    logger.error('Unable to create Lightning rpc', e)
    return null
  }
}

module.exports = generateLightningClient
