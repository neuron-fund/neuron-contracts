import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { Controller, NeuronPoolCurve3crvExtends__factory, IStrategy } from '../typechain-types';
import { ALUSD, ALUSD3CRV } from '../constants/addresses';

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre;
  const { deploy, get } = deployments;
  const [deployer] = await ethers.getSigners();

  const MasterChefDeployment = await get('MasterChef');
  const ControllerDeployment = await get('Controller');
  const controller = await ethers.getContractAt('Controller', ControllerDeployment.address) as Controller;
  const MockStrategyCurveALUSDDeployment = await get('MockStrategyCurveALUSD');
  const mockStrategyCurveALUSD = await ethers.getContractAt('IStrategy', MockStrategyCurveALUSDDeployment.address) as IStrategy;
  const NeuronPoolCurve3crvExtendsRealizationDeployment = await get('NeuronPoolCurve3crvExtendsRealization');

  const factory = await ethers.getContractFactory('NeuronPoolCurve3crvExtends') as NeuronPoolCurve3crvExtends__factory;

  const data = factory.interface.encodeFunctionData('initialize', [
    await mockStrategyCurveALUSD.want(),
    deployer.address,
    deployer.address,
    ControllerDeployment.address,
    MasterChefDeployment.address,
    ALUSD3CRV,
    ALUSD,
  ]);

  const NeuronPoolDeployment = await deploy('NeuronPoolCurveALUSD', {
    from: deployer.address,
    contract: 'ERC1967Proxy',
    args: [
      NeuronPoolCurve3crvExtendsRealizationDeployment.address,
      data,
    ],
  });

  await controller.setNPool(await mockStrategyCurveALUSD.want(), NeuronPoolDeployment.address);
  await controller.approveStrategy(await mockStrategyCurveALUSD.want(), mockStrategyCurveALUSD.address);
  await controller.setStrategy(await mockStrategyCurveALUSD.want(), mockStrategyCurveALUSD.address);
};

deploy.tags = ['NeuronPoolCurveALUSD']
deploy.dependencies = ['MasterChef', 'Controller', 'MockStrategyCurveALUSD', 'NeuronPoolCurve3crvExtendsRealization'];
export default deploy