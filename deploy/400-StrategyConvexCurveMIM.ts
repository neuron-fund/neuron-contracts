import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { StrategyConvexCurveMIM__factory } from '../typechain-types/factories/contracts/strategies/convex/curve/StrategyConvexCurveMim__factory';

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy, get } = deployments
  const [deployer, dev, treasury] = await ethers.getSigners();

  const ControllerDeployment = await get('Controller');
  const NeuronTokenDeployment = await get('NeuronToken');

  await deploy<DeployArgs<StrategyConvexCurveMIM__factory>>('StrategyConvexCurveMIM', {
    contract: 'StrategyConvexCurveMIM',
    from: deployer.address,
    args: [
      await deployer.getAddress(),
      await deployer.getAddress(),
      ControllerDeployment.address,
      NeuronTokenDeployment.address,
      await treasury.getAddress(),
    ]
  });
};

deploy.tags = ['StrategyConvexCurveMIM'];
deploy.dependencies = ['Controller', 'NeuronToken'];
export default deploy;