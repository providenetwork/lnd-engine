const { deadline } = require('../grpc-utils')

/**
 * Returns a list of open channels
 * @see https://api.lightning.community/#listchannels
 * @param {Object} opts
 * @param {LndClient} opts.client
 * @returns {Promise<Object>}
 */
function listChannels ({ client }) {
  return new Promise((resolve, reject) => {
    client.listChannels({}, { deadline: deadline() }, (err, res) => {
      if (err) return reject(err)
      return resolve(res)
    })
  })
}

module.exports = listChannels
