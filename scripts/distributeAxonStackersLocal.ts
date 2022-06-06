import { Wallet } from 'ethers'
import { formatEther, parseEther } from 'ethers/lib/utils'
import { ethers, network } from 'hardhat'
import { AxonAddress, FeeDistributorAddress, NeuronTokenAddress } from '../frontend/mainnetAddresses'
import { AxonVyper, FeeDistributor, NeuronToken } from '../typechain'
import { waitNDays, waitWeek } from '../utils/time'

const AdminPrivateKey = process.env.PROD_ADMIN_PRIVATE_KEY
const GovernancePrivateKey = process.env.PROD_GOVERNANCE_PRIVATE_KEY
async function main() {
  const [testAcc] = await ethers.getSigners()
  const admin = new Wallet(AdminPrivateKey, ethers.provider)
  const deployer = new Wallet(GovernancePrivateKey, ethers.provider)
  await testAcc.sendTransaction({
    to: admin.address,
    value: parseEther('10000'),
  })
  await testAcc.sendTransaction({
    to: deployer.address,
    value: parseEther('10000'),
  })
  const feeDistributor = (await ethers.getContractAt('FeeDistributor', FeeDistributorAddress, admin)) as FeeDistributor
  const axon = (await ethers.getContractAt('AxonVyper', AxonAddress, admin)) as AxonVyper
  const neuronToken = (await ethers.getContractAt('NeuronToken', NeuronTokenAddress, deployer)) as NeuronToken
  const tokensToDistribute = parseEther('3000')
  const isCheckpointAllowed = await feeDistributor.can_checkpoint_token()
  if (!isCheckpointAllowed) {
    console.log(`before main ~ toggle_allow_checkpoint_token`)
    console.log(`main ~ deployer`, admin.address)
    console.log('admin', await feeDistributor.admin())
    await feeDistributor.toggle_allow_checkpoint_token()
  }
  console.log(`after main ~ toggle_allow_checkpoint_token`)
  await neuronToken.mint(feeDistributor.address, tokensToDistribute)
  const feeDisrtrNeurBalance = await neuronToken.balanceOf(feeDistributor.address)
  console.log(`main ~ feeDisrtrNeurBalance`, formatEther(feeDisrtrNeurBalance))
  console.log(`after main ~ after mint`)
  await feeDistributor.checkpoint_token()
  // await axon.checkpoint()
  console.log(`after main ~ checkpoint_token`)
  await waitNDays(4, network.provider)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
