import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { StrategyConvexCurve3Pool__factory } from '../typechain-types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy } = deployments
  const [deployer, dev, treasury] = await ethers.getSigners();


  await deploy<DeployArgs<StrategyConvexCurve3Pool__factory>>('StrategyConvexCurve3Pool', {
    contract: 'StrategyConvexCurve3Pool',
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

deploy.tags = ['StrategyConvexCurve3Pool']
export default deploy