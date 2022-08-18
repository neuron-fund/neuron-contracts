import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { AirDrop__factory } from '../typechain-types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy } = deployments
  const signers = await ethers.getSigners()
  const deployer = signers[0]

  await deploy<DeployArgs<AirDrop__factory>>('AirDrop', {
    from: deployer.address,
    args: [deployer.address],
  })
}

deploy.tags = ['AirDrop']
export default deploy
