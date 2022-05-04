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
  const MockStrategyCurveUSDNDeployment = await get('MockStrategyCurveUSDN');
  const mockStrategyCurveUSDN = await ethers.getContractAt('MockStrategy', MockStrategyCurveUSDNDeployment.address) as MockStrategy;
  const NeuronPoolCurve3crvExtendsRealizationDeployment = await get('NeuronPoolCurve3crvExtendsRealization');

  const factory = await ethers.getContractFactory('NeuronPoolCurve3crvExtends') as NeuronPoolCurve3crvExtends__factory;

  const data = factory.interface.encodeFunctionData('initialize', [
    await mockStrategyCurveUSDN.want(),
    deployer.address,
    deployer.address,
    ControllerDeployment.address,
    MasterChefDeployment.address,
    '0x0f9cb53Ebe405d49A0bbdBD291A65Ff571bC83e1',
    '0x674C6Ad92Fd080e4004b2312b45f796a192D27a0',
  ]);

  const NeuronPoolDeployment = await deploy('NeuronPoolCurveUSDN', {
    from: deployer.address,
    contract: 'ERC1967Proxy',
    args: [
      NeuronPoolCurve3crvExtendsRealizationDeployment.address,
      data,
    ],
  });

  await controller.setNPool(await mockStrategyCurveUSDN.want(), mockStrategyCurveUSDN.address);
  await controller.approveStrategy(await mockStrategyCurveUSDN.want(), mockStrategyCurveUSDN.address);
  await controller.setStrategy(await mockStrategyCurveUSDN.want(), mockStrategyCurveUSDN.address);
};

deploy.tags = ['NeuronPoolCurveUSDN']
deploy.dependencies = ['MasterChef', 'Controller', 'MockStrategyCurveUSDN', 'NeuronPoolCurve3crvExtendsRealization'];
export default deploy