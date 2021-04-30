import { HardhatUserConfig } from "hardhat/config"
import "@nomiclabs/hardhat-ethers"
import "@nomiclabs/hardhat-waffle"
import "@typechain/hardhat"

const config: HardhatUserConfig = {
  solidity: '0.7.3',
  networks: {
    hardhat: {
      forking: {
        url: 'https://eth-mainnet.alchemyapi.io/v2/-FMJeLvq1mkgM2d9qs0o5HgPtzB3ob_C',
      }
    }
  },
  mocha: {
    timeout: 300000
  }
}

export default config