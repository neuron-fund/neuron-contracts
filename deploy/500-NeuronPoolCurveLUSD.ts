import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { Controller, MockStrategy, NeuronPoolCurve3crvExtends__factory } from '../typechain-types';


const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre;
  const { deploy, get } = deployments;
  const [deployer] = await ethers.getSigners();

  const MasterChefDeployment = await get('MasterChef');
  const ControllerDeployment = await get('Controller');
  const controller = await ethers.getContractAt('Controller', ControllerDeployment.address) as Controller;
  const MockStrategyCurveLUSDDeployment = await get('MockStrategyCurveLUSD');
  const mockStrategyCurveLUSD = await ethers.getContractAt('MockStrategy', MockStrategyCurveLUSDDeployment.address) as MockStrategy;

  const NeuronPoolCurve3crvExtendsRealizationDeployment = await get('NeuronPoolCurve3crvExtendsRealization');

  const factory = await ethers.getContractFactory('NeuronPoolCurve3crvExtends') as NeuronPoolCurve3crvExtends__factory;

  const data = factory.interface.encodeFunctionData('initialize', [
    await mockStrategyCurveLUSD.want(),
    deployer.address,
    deployer.address,
    ControllerDeployment.address,
    MasterChefDeployment.address,
    '0xEd279fDD11cA84bEef15AF5D39BB4d4bEE23F0cA',
    '0x5f98805A4E8be255a32880FDeC7F6728C6568bA0'
  ]);

  const NeuronPoolDeployment = await deploy('NeuronPoolCurveLUSD', {
    from: deployer.address,
    contract: 'ERC1967Proxy',
    args: [
      NeuronPoolCurve3crvExtendsRealizationDeployment.address,
      data,
    ],
  });

  await controller.setNPool(await mockStrategyCurveLUSD.want(), mockStrategyCurveLUSD.address);
  await controller.approveStrategy(await mockStrategyCurveLUSD.want(), mockStrategyCurveLUSD.address);
  await controller.setStrategy(await mockStrategyCurveLUSD.want(), mockStrategyCurveLUSD.address);
};

deploy.tags = ['NeuronPoolCurveLUSD']
deploy.dependencies = ['MasterChef', 'Controller', 'MockStrategyCurveLUSD', 'NeuronPoolCurve3crvExtendsRealization'];
export default deploy