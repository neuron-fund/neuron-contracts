import '@nomiclabs/hardhat-ethers'
import { ethers } from 'hardhat'
import { Wallet } from 'ethers'
import { GaugesDistributorPolygon } from '../typechain'
import { PolygonGaugesDistributorAddress, PolygonPools } from '../frontend/polygonAddresses'

const GovernancePrivateKey = process.env.PROD_GOVERNANCE_PRIVATE_KEY

// Transaction options since global hardhat gasPrice config not working well
const txOptions = {
  gasPrice: 80e9,
}

export async function deploy() {
  const deployer = new Wallet(GovernancePrivateKey, ethers.provider)
  const deployerAddress = await deployer.getAddress()

  const gaugesDistributor = (await ethers.getContractAt(
    'GaugesDistributorPolygon',
    PolygonGaugesDistributorAddress,
    deployer
  )) as GaugesDistributorPolygon

  const deployedStrategies = PolygonPools

  const numberOfStrategies = Object.values(deployedStrategies).length
  const weights = [...new Array(numberOfStrategies)].map(x => 100 / numberOfStrategies).map(Math.floor)

  if (100 % numberOfStrategies) {
    weights[0] = weights[0] + (100 % numberOfStrategies)
  }

  const setWeightTx = await gaugesDistributor.setWeights(
    Object.values(deployedStrategies).map(x => x.poolAddress),
    weights,
    txOptions
  )
  await setWeightTx.wait(3)
  // Pre mint
}

deploy()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
