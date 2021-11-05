import { config as dontenvConfig } from 'dotenv'
import dotenvExpand from 'dotenv-expand'
const env = dontenvConfig()
dotenvExpand(env)
import { testPrivateKeys } from './utils/testPrivateKeys'

import { HardhatUserConfig } from "hardhat/config"
import "@nomiclabs/hardhat-ethers"
import "@nomiclabs/hardhat-waffle"
import "@nomiclabs/hardhat-vyper"
import "hardhat-deploy-ethers"
import "hardhat-deploy"
import "@nomiclabs/hardhat-web3"
import 'hardhat-abi-exporter'
import "@typechain/hardhat"
import "hardhat-gas-reporter"
import "@nomiclabs/hardhat-etherscan"
import "@openzeppelin/hardhat-upgrades"

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
      chainId: process.env.POLYGON ? 1339 : 1337,
      forking: {
        url: process.env.POLYGON ? process.env.ALCHEMY_POLYGON : process.env.ALCHEMY,
      },
      loggingEnabled: true,
      blockGasLimit: 0x1fffffffffffff,
      accounts: getHardhatAccounts(20),
      gas: 120e9,
    },
    prodMainnet: {
      url: process.env.PROD_MAINNET_RPC,
      gasPrice: 40e9,
      blockGasLimit: 5e6
    },
    prodPolygon: {
      url: process.env.PROD_POLYGON_RPC,
    },
    localPolygon: {
      url: 'http://127.0.0.1:8546/',
      accounts: getHardhatAccounts(20).map(x => x.privateKey)
    },
    testnet: {
      url: 'https://neurontestnet.xyz/',
      accounts: getHardhatAccounts(20).map(x => x.privateKey)
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API
  },
  vyper: {
    version: '0.2.12'
  },
  mocha: {
    reporter: 'eth-gas-reporter',
    timeout: 300000,
  },
  // namedAccounts: {
  //   default: {
  //     default: 0,

  //   }
  // }
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