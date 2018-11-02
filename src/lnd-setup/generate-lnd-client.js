/**
 * Lnd Client Module
 * @module src/lnd-setup/generate-lnd-client
 */

const grpc = require('grpc')
const grpcProtoLoader = require('@grpc/proto-loader')
const fs = require('fs')

/**
 * Default values for grpc/proto-loader that mimic the default behaivor
 * of grpc.
 *
 * @global
 * @constant
 * @type {Object}
 * @default
 */
const GRPC_OPTIONS = {
  longs: String,
  bytes: String,
  enums: String,
  defaults: true,
  oneofs: true
}

/**
 * Generates credentials for authentication to the LND rpc server
 *
 * @function
 * @private
 * @see https://github.com/lightningnetwork/lnd/blob/master/docs/macaroons.md
 * @param {String} tlsCertPath
 * @param {String} lndMacaroonPath
 * @return {grpc.credentials}
 */
function generateCredentials (tlsCertPath, macaroonPath, { logger }) {
  const macaroonExists = fs.existsSync(macaroonPath)

  if (!macaroonExists) {
    logger.info(`LND-ENGINE warning - macaroon path not found at path: ${macaroonPath}`)
  }
  if (!fs.existsSync(tlsCertPath)) throw new Error(`LND-ENGINE error - tls cert file not found at path: ${tlsCertPath}`)

  const tls = fs.readFileSync(tlsCertPath)

  // We set the macaroon to a blank string if it does not exists here because there
  // is a chance the macaroon hasn't been created.
  // A macaroon will not be created if:
  //
  // 1. An LND wallet hasn't been initialized
  // 2. The daemon/docker has messed up
  const macaroon = macaroonExists ? fs.readFileSync(macaroonPath) : ''

  const metadata = new grpc.Metadata()
  metadata.add('macaroon', macaroon.toString('hex'))

  const macaroonCredentials = grpc.credentials.createFromMetadataGenerator((_, cb) => cb(null, metadata))
  const sslCredentials = grpc.credentials.createSsl(tls)

  return grpc.credentials.combineChannelCredentials(sslCredentials, macaroonCredentials)
}

/**
 * Generates a proto definition for a specified proto file path
 *
 * @function
 * @private
 * @param {String} path - lnd protofile path
 * @return {grpc.Object}
 * @throws {Error} proto file not found
 */
function loadProto (path) {
  if (!fs.existsSync(path)) throw new Error(`LND-ENGINE error - Proto file not found at path: ${path}`)

  const packageDefinition = grpcProtoLoader.loadSync(path, GRPC_OPTIONS)
  return grpc.loadPackageDefinition(packageDefinition)
}

/**
 *
 * Generates a proto definition for a specified proto file path
 *
 * @function
 * @param {String} host - lnd host address
 * @param {String} protoFilePath - lnd protobuf file path
 * @return {grpc.Client}
 */
function generateLndClient (host, protoPath, tlsCertPath, macaroonPath, { logger }) {
  const stuff = loadProto(protoPath)
  logger.info('stuff', JSON.stringify(stuff))

  const { lnrpc } = stuff
  const credentials = generateCredentials(tlsCertPath, macaroonPath, { logger })

  return new lnrpc.Lightning(host, credentials, {})
}

module.exports = generateLndClient
