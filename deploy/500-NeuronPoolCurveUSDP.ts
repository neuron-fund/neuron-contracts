import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { Controller, IStrategy, NeuronPoolCurve3crvExtends__factory } from '../typechain-types';


const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre;
  const { deploy, get } = deployments;
  const [deployer] = await ethers.getSigners();

  const MasterChefDeployment = await get('MasterChef');
  const ControllerDeployment = await get('Controller');
  const controller = await ethers.getContractAt('Controller', ControllerDeployment.address) as Controller;
  const MockStrategyCurveUSDPDeployment = await get('MockStrategyCurveUSDP');
  const mockStrategyCurveUSDP = await ethers.getContractAt('IStrategy', MockStrategyCurveUSDPDeployment.address) as IStrategy;
  const NeuronPoolCurve3crvExtendsRealizationDeployment = await get('NeuronPoolCurve3crvExtendsRealization');

  const factory = await ethers.getContractFactory('NeuronPoolCurve3crvExtends') as NeuronPoolCurve3crvExtends__factory;

  const data = factory.interface.encodeFunctionData('initialize', [
    await mockStrategyCurveUSDP.want(),
    deployer.address,
    deployer.address,
    ControllerDeployment.address,
    MasterChefDeployment.address,
    '0x42d7025938bEc20B69cBae5A77421082407f053A',
    '0x1456688345527bE1f37E9e627DA0837D6f08C925',
  ]);

  const NeuronPoolDeployment = await deploy('NeuronPoolCurveUSDP', {
    from: deployer.address,
    contract: 'ERC1967Proxy',
    args: [
      NeuronPoolCurve3crvExtendsRealizationDeployment.address,
      data,
    ],
  });

  await controller.setNPool(await mockStrategyCurveUSDP.want(), mockStrategyCurveUSDP.address);
  await controller.approveStrategy(await mockStrategyCurveUSDP.want(), mockStrategyCurveUSDP.address);
  await controller.setStrategy(await mockStrategyCurveUSDP.want(), mockStrategyCurveUSDP.address);
};

deploy.tags = ['NeuronPoolCurveUSDP']
deploy.dependencies = ['MasterChef', 'Controller', 'MockStrategyCurveUSDP', 'NeuronPoolCurve3crvExtendsRealization'];
export default deploy