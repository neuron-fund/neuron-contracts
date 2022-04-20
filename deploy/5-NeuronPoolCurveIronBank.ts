import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { Controller, MockStrategy } from '../typechain'
import { DeployArgs } from '../types'
import { NeuronPoolCurveIronBank__factory } from '../typechain-types';


const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre;
  const { deploy, get } = deployments;
  const [deployer] = await ethers.getSigners();

  const MasterChefDeployment = await get('MasterChef');
  const ControllerDeployment = await get('Controller');
  const controller = await ethers.getContractAt('Controller', ControllerDeployment.address) as Controller;
  const MockStrategyCurveIronBankDeployment = await get('MockStrategyCurveIronBank');
  const mockStrategyCurveIronBank = await ethers.getContractAt('MockStrategy', MockStrategyCurveIronBankDeployment.address) as MockStrategy;

  const NeuronPoolDeployment = await deploy<DeployArgs<NeuronPoolCurveIronBank__factory>>('NeuronPoolCurveIronBank', {
    contract: 'NeuronPoolCurveIronBank',
    from: deployer.address,
    args: [
      await mockStrategyCurveIronBank.want(),
      deployer.address,
      deployer.address,
      ControllerDeployment.address,
      MasterChefDeployment.address,
    ],
  });

  await controller.setNPool(await mockStrategyCurveIronBank.want(), NeuronPoolDeployment.address);
  await controller.approveStrategy(await mockStrategyCurveIronBank.want(), mockStrategyCurveIronBank.address);
  await controller.setStrategy(await mockStrategyCurveIronBank.want(), mockStrategyCurveIronBank.address);
};

deploy.tags = ['NeuronPoolCurveIronBank']
deploy.dependencies = ['MasterChef', 'Controller', 'MockStrategyCurveIronBank'];
export default deploy