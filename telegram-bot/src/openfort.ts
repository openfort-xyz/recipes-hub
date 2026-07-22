import Openfort from '@openfort/openfort-node'
import { config } from './config.js'

export const openfort = new Openfort(config.openfortSecretKey, {
  walletSecret: config.openfortWalletSecret,
})
