import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { StrategyConvexCurveFrax__factory } from '../typechain-types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy } = deployments
  const [deployer, dev, treasury] = await ethers.getSigners();


  await deploy<DeployArgs<StrategyConvexCurveFrax__factory>>('StrategyConvexCurveFrax', {
    contract: 'StrategyConvexCurveFrax',
    from: deployer.address,
    args: [
      await deployer.getAddress(),
      await deployer.getAddress(),
      await deployer.getAddress(),
      await dev.getAddress(),
      await treasury.getAddress(),
    ]
  });
}

deploy.tags = ['StrategyConvexCurveFrax']
export default deploy