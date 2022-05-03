import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { NeuronPoolCurve3pool__factory } from '../typechain-types/factories/contracts/neuron_pools/curve';
import { Controller, MockStrategy } from '../typechain-types';


const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre;
  const { deploy, get } = deployments;
  const [deployer] = await ethers.getSigners();

  const MasterChefDeployment = await get('MasterChef');
  const ControllerDeployment = await get('Controller');
  const controller = await ethers.getContractAt('Controller', ControllerDeployment.address) as Controller;
  const MockStrategyCurve3poolDeployment = await get('MockStrategyCurve3pool');
  const mockStrategyCurve3pool = await ethers.getContractAt('MockStrategy', MockStrategyCurve3poolDeployment.address) as MockStrategy;

  const NeuronPoolDeployment = await deploy<DeployArgs<NeuronPoolCurve3pool__factory>>('NeuronPoolCurve3pool', {
    contract: 'NeuronPoolCurve3pool',
    from: deployer.address,
    args: [
      await mockStrategyCurve3pool.want(),
      deployer.address,
      deployer.address,
      ControllerDeployment.address,
      MasterChefDeployment.address,
    ],
  });

  await controller.setNPool(await mockStrategyCurve3pool.want(), NeuronPoolDeployment.address);
  await controller.approveStrategy(await mockStrategyCurve3pool.want(), mockStrategyCurve3pool.address);
  await controller.setStrategy(await mockStrategyCurve3pool.want(), mockStrategyCurve3pool.address);
};

deploy.tags = ['NeuronPoolCurve3pool']
deploy.dependencies = ['MasterChef', 'Controller', 'MockStrategyCurve3pool'];
export default deploy