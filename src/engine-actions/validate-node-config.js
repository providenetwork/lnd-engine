const { promisify } = require('util')
const { getInfo } = require('../lnd-actions')

/**
 * CODE 12 for gprc is equal to 'unimplemented
 * @see https://github.com/grpc/grpc-go/blob/master/codes/codes.go
 * @constant
 * @type {Number}
 * @default
 */
const UNKNOWN_LIGHTNING_SERVICE_CODE = 12

/**
 * Rough estimate if the lnd instance's wallet is unlocked or not
 *
 * @return {Boolean} isUnlocked
 */
async function isEngineUnlocked (client) {
  try {
    // If the call to `getInfo` succeeds, then we can assume that our LND instance
    // is unlocked and functional
    await getInfo({ client })
    return true
  } catch (e) {
    // CODE 12 for grpc is equal to 'unknown service' or an error type of
    // unimplemented.
    // In GRPC Unimplemented indicates operation is not implemented or not
    // supported/enabled in this specific service.
    if (e.code && e.code === UNKNOWN_LIGHTNING_SERVICE_CODE) {
      return false
    }

    // We return true, because the error is unrelated to a service not being implemented
    // and the user will now have to troubleshoot further
    return true
  }
}
/**
 * Validates this engine's configuration against the node it is
 * hooked up to.
 *
 * @function
 * @return {Boolean} Whether the configuration matches the node
 */
async function validateNodeConfig () {
  const isUnlocked = await isEngineUnlocked(this.client)

  // We need to set the `isUnlocked` variable here so that end users can call the engine
  // and validate if the engine is available or not
  this.isUnlocked = isUnlocked

  // If the Lightning service is not available (wallet is not unlocked) on the engine
  // then we should check the only non-modifying endpoint of the WalletUnlocker to make
  // sure that a connection to the daemon can be made.
  if (!isUnlocked) {
    await promisify(this.walletUnlocker.genSeed)({})
    return true
  }

  // If the wallet is unlocked and functional in LND (Lightning service is available),
  // then we can validate that all information on the node is correct before allowing the
  // user to continue
  const { chains = [] } = await getInfo({ client: this.client })

  if (chains.length === 0) {
    throw new Error('LND has no chains configured.')
  }

  if (chains.length > 1) {
    throw new Error(`LndEngine can support an LND instance with at most one chain active. Found: ${chains}`)
  }

  const [ chainName ] = chains

  if (chainName !== this.currencyConfig.chainName) {
    throw new Error(`Mismatched configuration: Engine is configured for ${this.currencyConfig.chainName}, LND is configured for ${chainName}.`)
  }

  return true
}

module.exports = validateNodeConfig
