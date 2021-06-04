
import "@nomiclabs/hardhat-ethers"
import { ethers, network } from "hardhat"
import { ContractFactory, providers, Signer, Wallet } from "ethers"
import { get3Crv, getRenCrv, getSteCrv } from '../utils/getCurveTokens'
import { GaugesDistributor, GaugesDistributor__factory } from '../typechain'
import { GaugeDistributorAddress } from '../frontend/constants'

const { formatEther, parseEther, parseUnits } = ethers.utils

async function main () {
  const accounts = await ethers.getSigners()
  const deployer = accounts[5]
  const provider = providers.getDefaultProvider('http://127.0.0.1:8545/')

  const oneWeekInSeconds = 60 * 60 * 24 * 7
  await network.provider.send('evm_increaseTime', [oneWeekInSeconds])
  await network.provider.send('evm_mine')


  const gaugesDistributor = await ethers.getContractAt('GaugesDistributor', GaugeDistributorAddress, deployer) as GaugesDistributor
  await gaugesDistributor.collect()
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })