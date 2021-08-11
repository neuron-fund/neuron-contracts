import { config as dontenvConfig } from 'dotenv'
import dotenvExpand from 'dotenv-expand'
const env = dontenvConfig()
dotenvExpand(env)

import { HardhatUserConfig } from "hardhat/config"
import "@nomiclabs/hardhat-ethers"
import "@nomiclabs/hardhat-waffle"
import "@nomiclabs/hardhat-vyper"
import "hardhat-deploy-ethers"
import "hardhat-deploy"
import "@nomiclabs/hardhat-web3"
import 'hardhat-abi-exporter'
import { testPrivateKeys } from './utils/testPrivateKeys'
import "@typechain/hardhat"


const config: HardhatUserConfig = {
  solidity: '0.8.2',
  abiExporter: {
    path: './abi'
  },
  networks: {
    hardhat: {
      chainId: 1337,
      forking: {
        url: process.env.ALCHEMY,
      },
      loggingEnabled: true,
      accounts: getHardhatAccounts(20)
    },
    testnet: {
      url: 'https://neurontestnet.xyz/',
      accounts: getHardhatAccounts(20).map(x => x.privateKey)
    }
  },
  vyper: {
    version: '0.2.12'
  },
  mocha: {
    timeout: 300000
  }
}

function getHardhatAccounts (accountsNumber: number) {
  return testPrivateKeys
    .map(x => {
      const TEN_MILLION_ETH = "10000000000000000000000000"
      return {
        privateKey: x,
        balance: TEN_MILLION_ETH,
      }
    })
}


export default config