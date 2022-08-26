import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { NeuronToken__factory } from '../typechain-types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy, get } = deployments
  const signers = await ethers.getSigners();
  const deployer = signers[0]

  const AirDropDeployment = await get('AirDrop')

  const initialHoldres = [
    {
      recipient: signers[0].address,
      amount: ethers.utils.parseEther('1000'),
    },
    {
      recipient: signers[1].address,
      amount: ethers.utils.parseEther('100'),
    },
    {
      recipient: AirDropDeployment.address,
      amount: ethers.utils.parseEther('100'),
    },
  ]
  const transferAllower = signers[10];

  await deploy<DeployArgs<NeuronToken__factory>>('NeuronToken', {
    from: deployer.address,
    args: [initialHoldres, transferAllower.address],
  })
}

deploy.tags = ['NeuronToken']
deploy.dependencies = ['AirDrop']
export default deploy
