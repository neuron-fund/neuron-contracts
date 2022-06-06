import { Wallet } from 'ethers'
import { ethers } from 'hardhat'
import { GaugeDistributorAddress } from '../frontend/mainnetAddresses'
import { GaugesDistributor } from '../typechain'

const GovernancePrivateKey = process.env.PROD_GOVERNANCE_PRIVATE_KEY
async function main() {
  const deployer = new Wallet(GovernancePrivateKey, ethers.provider)
  const gaugesDistributor = (await ethers.getContractAt(
    'GaugesDistributor',
    GaugeDistributorAddress,
    deployer
  )) as GaugesDistributor
  await gaugesDistributor.distribute()
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
