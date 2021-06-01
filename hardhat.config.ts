import { config as dontenvConfig } from 'dotenv'
import dotenvExpand from 'dotenv-expand'
const env = dontenvConfig()
dotenvExpand(env)
import { HardhatUserConfig, task } from "hardhat/config"
import "@nomiclabs/hardhat-ethers"
import "@nomiclabs/hardhat-waffle"
import "@typechain/hardhat"
import "hardhat-deploy-ethers"
import "hardhat-deploy"
import "@nomiclabs/hardhat-web3"
import 'hardhat-abi-exporter'
import "@nomiclabs/hardhat-vyper";
import { testPrivateKeys } from './utils/testPrivateKeys'

const config: HardhatUserConfig = {
  solidity: '0.7.3',
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
    }
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