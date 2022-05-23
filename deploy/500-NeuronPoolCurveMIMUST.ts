import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { NeuronPoolCurveMIMUST__factory } from '../typechain-types/factories/contracts/neuron_pools/curve';
import { Controller, MockStrategy } from '../typechain-types';


const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre;
  const { deploy, get } = deployments;
  const [deployer] = await ethers.getSigners();

  const MasterChefDeployment = await get('MasterChef');
  const ControllerDeployment = await get('Controller');
  const controller = await ethers.getContractAt('Controller', ControllerDeployment.address) as Controller;
  const MockStrategyCurveMIMUSTDeployment = await get('MockStrategyCurveMIMUST');
  const mockStrategyCurveMIMUST = await ethers.getContractAt('MockStrategy', MockStrategyCurveMIMUSTDeployment.address) as MockStrategy;

  const NeuronPoolDeployment = await deploy<DeployArgs<NeuronPoolCurveMIMUST__factory>>('NeuronPoolCurveMIMUST', {
    contract: 'NeuronPoolCurveMIMUST',
    from: deployer.address,
    args: [
      await mockStrategyCurveMIMUST.want(),
      deployer.address,
      deployer.address,
      ControllerDeployment.address,
      MasterChefDeployment.address,
    ],
  });

  await controller.setNPool(await mockStrategyCurveMIMUST.want(), mockStrategyCurveMIMUST.address);
  await controller.approveStrategy(await mockStrategyCurveMIMUST.want(), mockStrategyCurveMIMUST.address);
  await controller.setStrategy(await mockStrategyCurveMIMUST.want(), mockStrategyCurveMIMUST.address);
};

deploy.tags = ['NeuronPoolCurveMIMUST']
deploy.dependencies = ['MasterChef', 'Controller', 'MockStrategyCurveMIMUST'];
export default deploy