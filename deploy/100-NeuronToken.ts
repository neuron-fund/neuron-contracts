import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { NeuronToken__factory } from '../typechain-types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy } = deployments
  const deployer = (await ethers.getSigners())[0]

  await deploy<DeployArgs<NeuronToken__factory>>('NeuronToken', {
    from: deployer.address,
    args: [deployer.address],
  })
}

deploy.tags = ['NeuronToken']
export default deploy
