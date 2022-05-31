import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { StrategyConvexCurveCrvEth__factory } from '../typechain-types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy, get } = deployments
  const [deployer, dev, treasury] = await ethers.getSigners();

  const ControllerDeployment = await get('Controller');
  const NeuronTokenDeployment = await get('NeuronToken');

  await deploy<DeployArgs<StrategyConvexCurveCrvEth__factory>>('StrategyConvexCurveCrvEth', {
    contract: 'StrategyConvexCurveCrvEth',
    from: deployer.address,
    args: [
      await deployer.getAddress(),
      await deployer.getAddress(),
      ControllerDeployment.address,
      NeuronTokenDeployment.address,
      await treasury.getAddress(),
    ]
  });
}

deploy.tags = ['StrategyConvexCurveCrvEth']
deploy.dependencies = ['Controller', 'NeuronToken'];
export default deploy