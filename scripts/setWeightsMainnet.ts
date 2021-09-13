import "@nomiclabs/hardhat-ethers"
import { ethers } from "hardhat"
import { Wallet } from "ethers"
import { GaugesDistributor } from '../typechain'
import { GaugeDistributorAddress, Pools } from '../frontend/mainnetAddresses'


const GovernancePrivateKey = process.env.PROD_GOVERNANCE_PRIVATE_KEY


// Key addresses


// Deployed contracts addressses


// Transaction options since global hardhat gasPrice config not working well
const txOptions = {
  gasPrice: 80e9
}

export async function deploy () {
  const deployer = new Wallet(GovernancePrivateKey, ethers.provider)

  const gaugesDistributor = await ethers.getContractAt('GaugesDistributor', GaugeDistributorAddress, deployer) as GaugesDistributor

  const deployedStrategies = Pools

  const numberOfStrategies = Object.values(deployedStrategies).length
  const weights = [...new Array(numberOfStrategies)].map(() => 100 / numberOfStrategies).map(Math.floor)

  if (100 % numberOfStrategies) {
    weights[0] = weights[0] + 100 % numberOfStrategies
  }

  const setWeightTx = await gaugesDistributor.setWeights(Object.values(deployedStrategies).map(x => x.poolAddress), weights, txOptions)
  await setWeightTx.wait(3)
  // Pre mint
}

deploy()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
