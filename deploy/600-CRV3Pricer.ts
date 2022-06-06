import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { CRV3Pricer__factory } from '../typechain-types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy } = deployments
  const [deployer] = await ethers.getSigners()

  await deploy<DeployArgs<CRV3Pricer__factory>>('CRV3Pricer', {
    contract: 'CRV3Pricer',
    from: deployer.address,
    args: [],
  })
}

deploy.tags = ['CRV3Pricer']
export default deploy
