import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { Controller, IStrategy, NeuronPoolCurve3crvExtends__factory } from '../typechain-types';
import { USDN, USDN3CRV } from '../constants/addresses';


const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre;
  const { deploy, get } = deployments;
  const [deployer] = await ethers.getSigners();

  const MasterChefDeployment = await get('MasterChef');
  const ControllerDeployment = await get('Controller');
  const controller = await ethers.getContractAt('Controller', ControllerDeployment.address) as Controller;
  const MockStrategyCurveUSDNDeployment = await get('MockStrategyCurveUSDN');
  const mockStrategyCurveUSDN = await ethers.getContractAt('IStrategy', MockStrategyCurveUSDNDeployment.address) as IStrategy;
  const NeuronPoolCurve3crvExtendsRealizationDeployment = await get('NeuronPoolCurve3crvExtendsRealization');

  const factory = await ethers.getContractFactory('NeuronPoolCurve3crvExtends') as NeuronPoolCurve3crvExtends__factory;

  const data = factory.interface.encodeFunctionData('initialize', [
    await mockStrategyCurveUSDN.want(),
    deployer.address,
    deployer.address,
    ControllerDeployment.address,
    MasterChefDeployment.address,
    USDN3CRV,
    USDN,
  ]);

  const NeuronPoolDeployment = await deploy('NeuronPoolCurveUSDN', {
    from: deployer.address,
    contract: 'ERC1967Proxy',
    args: [
      NeuronPoolCurve3crvExtendsRealizationDeployment.address,
      data,
    ],
  });

  await controller.setNPool(await mockStrategyCurveUSDN.want(), NeuronPoolDeployment.address);
  await controller.approveStrategy(await mockStrategyCurveUSDN.want(), mockStrategyCurveUSDN.address);
  await controller.setStrategy(await mockStrategyCurveUSDN.want(), mockStrategyCurveUSDN.address);
};

deploy.tags = ['NeuronPoolCurveUSDN']
deploy.dependencies = ['MasterChef', 'Controller', 'MockStrategyCurveUSDN', 'NeuronPoolCurve3crvExtendsRealization'];
export default deploy