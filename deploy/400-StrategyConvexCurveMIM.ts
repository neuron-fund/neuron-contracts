import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { StrategyConvexCurveMIM__factory } from '../typechain-types/factories/contracts/strategies/convex/curve/StrategyConvexCurveMim__factory';

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy } = deployments
  const [deployer, dev, treasury] = await ethers.getSigners();

  await deploy<DeployArgs<StrategyConvexCurveMIM__factory>>('StrategyConvexCurveMIM', {
    contract: 'StrategyConvexCurveMIM',
    from: deployer.address,
    args: [
      await deployer.getAddress(),
      await deployer.getAddress(),
      await deployer.getAddress(),
      await dev.getAddress(),
      await treasury.getAddress(),
    ]
  });
};

deploy.tags = ['StrategyConvexCurveMIM'];
export default deploy;