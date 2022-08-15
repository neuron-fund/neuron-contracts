import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { NeuronToken__factory } from '../typechain-types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy } = deployments
  const signers = await ethers.getSigners();
  const deployer = signers[0]
  const users = [
    signers[1].address,
    signers[2].address,
    signers[3].address,
  ]
  const transferAllower = signers[10];

  await deploy<DeployArgs<NeuronToken__factory>>('NeuronToken', {
    from: deployer.address,
    args: [users, transferAllower.address],
  })
}

deploy.tags = ['NeuronToken']
export default deploy
