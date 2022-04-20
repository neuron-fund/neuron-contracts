import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { Controller, MockStrategy } from '../typechain'
import { DeployArgs } from '../types'
import { NeuronPoolCurve3crvExtends__factory } from '../typechain-types';


const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre;
  const { deploy, get } = deployments;
  const [deploer] = await ethers.getSigners();

  const MasterChefDeployment = await get('MasterChef');
  const ControllerDeployment = await get('Controller');
  const controller = await ethers.getContractAt('Controller', ControllerDeployment.address) as Controller;
  const MockStrategyCurveMIMDeployment = await get('MockStrategyCurveMIM');
  const mockStrategyCurveMIM = await ethers.getContractAt('MockStrategy', MockStrategyCurveMIMDeployment.address) as MockStrategy;

  const NeuronPoolDeployment = await deploy<DeployArgs<NeuronPoolCurve3crvExtends__factory>>('NeuronPoolCurveMIM', {
    contract: 'NeuronPoolCurve3crvExtends',
    from: deploer.address,
    args: [
      await mockStrategyCurveMIM.want(),
      deploer.address,
      deploer.address,
      ControllerDeployment.address,
      MasterChefDeployment.address,
      '0x5a6A4D54456819380173272A5E8E9B9904BdF41B',
      '0x99D8a9C45b2ecA8864373A26D1459e3Dff1e17F3',
    ],
  });

  await controller.setNPool(await mockStrategyCurveMIM.want(), mockStrategyCurveMIM.address);
  await controller.approveStrategy(await mockStrategyCurveMIM.want(), mockStrategyCurveMIM.address);
  await controller.setStrategy(await mockStrategyCurveMIM.want(), mockStrategyCurveMIM.address);
};

deploy.tags = ['NeuronPoolCurveMIM']
deploy.dependencies = ['MasterChef', 'Controller', 'MockStrategyCurveMIM'];
export default deploy