const { currencies } = require('./config')
const {
  generateLightningClient,
  generateWalletUnlockerClient
} = require('./lnd-setup')
const {
  validationDependentActions,
  validationIndependentActions
} = require('./engine-actions')
const { exponentialBackoff } = require('./utils')

/**
 * @constant
 * @type {String}
 * @default
 */
const LND_PROTO_FILE_PATH = require.resolve('../proto/lnd-rpc.proto')

/**
 * The public interface for interaction with an LND instance
 */
class LndEngine {
  /**
   * LndEngine Constructor
   *
   * @class
   * @param {String} host - host gRPC address
   * @param {String} symbol Common symbol of the currency this engine supports (e.g. `BTC`)
   * @param {Object} [options={}]
   * @param {Logger} [options.logger=console] - logger used by the engine
   * @param {String} options.tlsCertPath - file path to the TLS certificate for LND
   * @param {String} options.macaroonPath - file path to the macaroon file for LND
   */
  constructor (host, symbol, { logger = console, tlsCertPath, macaroonPath } = {}) {
    if (!host) {
      throw new Error('Host is required for lnd-engine initialization')
    }

    this.host = host
    this.symbol = symbol
    this.currencyConfig = currencies.find(({ symbol }) => symbol === this.symbol)

    if (!this.currencyConfig) {
      throw new Error(`${symbol} is not a valid symbol for this engine.`)
    }

    this.logger = logger
    this.tlsCertPath = tlsCertPath
    this.macaroonPath = macaroonPath
    this.protoPath = LND_PROTO_FILE_PATH
    this.client = generateLightningClient(this)
    this.walletUnlocker = generateWalletUnlockerClient(this)

    // This key will let the consumer know if the current Engine's configuration
    // matches that of the information passed through the constructor of the Engine.
    //
    // The configuration of the Engine lets the user know what currencies/chains are
    // currently supported, as well as providing assurance that communication to
    // an engine's node is available.
    //
    //
    // We set validated to false by default, however this will be modified in the
    // `validateNodeConfig` action
    this.validated = false

    // This key will let the consumer know if the current Engine requires additional setup
    // or if the engine is ready to process requests. An LND Engine is referred to as `locked`
    // when no wallet is present OR if LND Engine requires a password to unlock the current
    // wallet
    //
    // We set unlocked to false by default, however this will be modified in the
    // `isEngineUnlocked` action
    this.unlocked = false

    // We wrap all validation dependent actions in a callback so we can prevent
    // their use if the current engine is in a state that prevents a call from
    // functioning correctly.
    Object.entries(validationDependentActions).forEach(([name, action]) => {
      this[name] = (...args) => {
        if (!this.validated) throw new Error(`${symbol} Engine is not ready yet`)
        return action.call(this, ...args)
      }
    })

    Object.entries(validationIndependentActions).forEach(([name, action]) => {
      this[name] = action
    })
  }

  /**
   * Validates and sets the current state of an engine
   *
   * States of the Engine:
   * - Locked - First-time use or engine requires a password to have access to funds
   * - Unlocked and Invalid - Wallet is present, password has unlocked engine, but configuration is messed up
   * - Unlocked and Validated - engine is fully functional and ready to accept requests
   *
   * @returns {void}
   */
  async validateEngine () {
    try {
      // We make a initial call to check if engine is unlocked. The result updates
      // `this.unlocked` and is then used in the underlying configuration check.
      await this.isEngineUnlocked()

      // It can take an extended period time for the engines to be ready, due to blockchain
      // syncing or setup, so we use exponential backoff to retry validation until
      // it is either successful or there is something wrong.
      const validationCall = () => this.validateNodeConfig()
      const payload = { symbol: this.symbol }
      const errorMessage = 'Engine failed to validate. Retrying'
      await exponentialBackoff(validationCall, payload, { errorMessage, logger: this.logger })
    } catch (e) {
      return this.logger.error(`Failed to validate engine for ${this.symbol}, error: ${e}`, { error: e })
    }

    this.logger.info(`Validated engine configuration for ${this.symbol}`)
  }
}

module.exports = LndEngine
