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
  solidity: {
    compilers: [
      {
        version: '0.6.12',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: '0.8.2',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
    ],
  },
  abiExporter: {
    path: './abi'
  },
  networks: {
    hardhat: {
      chainId: 1337,
      forking: {
        url: process.env.POLYGON ? process.env.ALCHEMY_POLYGON : process.env.ALCHEMY,
      },
      loggingEnabled: true,
      blockGasLimit: 0x1fffffffffffff,
      accounts: getHardhatAccounts(20),
      gas: 1200000000,
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
    timeout: 300000,
  }
}

function getHardhatAccounts (accountsNumber: number) {
  return testPrivateKeys
    .map(x => {
      const A_LOT_OF_ETH = "100000000000000000000000000000000000000000"
      return {
        privateKey: x,
        balance: A_LOT_OF_ETH,
      }
    })
}


export default config