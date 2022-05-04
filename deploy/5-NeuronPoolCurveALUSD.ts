import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { Controller, MockStrategy, NeuronPoolCurve3crvExtends__factory } from '../typechain-types';

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre;
  const { deploy, get } = deployments;
  const [deployer] = await ethers.getSigners();

  const MasterChefDeployment = await get('MasterChef');
  const ControllerDeployment = await get('Controller');
  const controller = await ethers.getContractAt('Controller', ControllerDeployment.address) as Controller;
  const MockStrategyCurveALUSDDeployment = await get('MockStrategyCurveALUSD');
  const mockStrategyCurveALUSD = await ethers.getContractAt('MockStrategy', MockStrategyCurveALUSDDeployment.address) as MockStrategy;
  const NeuronPoolCurve3crvExtendsRealizationDeployment = await get('NeuronPoolCurve3crvExtendsRealization');

  const factory = await ethers.getContractFactory('NeuronPoolCurve3crvExtends') as NeuronPoolCurve3crvExtends__factory;

  const data = factory.interface.encodeFunctionData('initialize', [
    await mockStrategyCurveALUSD.want(),
    deployer.address,
    deployer.address,
    ControllerDeployment.address,
    MasterChefDeployment.address,
    '0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c',
    '0xBC6DA0FE9aD5f3b0d58160288917AA56653660E9'
  ]);

  const NeuronPoolDeployment = await deploy('NeuronPoolCurveALUSD', {
    from: deployer.address,
    contract: 'ERC1967Proxy',
    args: [
      NeuronPoolCurve3crvExtendsRealizationDeployment.address,
      data,
    ],
  });

  await controller.setNPool(await mockStrategyCurveALUSD.want(), mockStrategyCurveALUSD.address);
  await controller.approveStrategy(await mockStrategyCurveALUSD.want(), mockStrategyCurveALUSD.address);
  await controller.setStrategy(await mockStrategyCurveALUSD.want(), mockStrategyCurveALUSD.address);
};

deploy.tags = ['NeuronPoolCurveALUSD']
deploy.dependencies = ['MasterChef', 'Controller', 'MockStrategyCurveALUSD', 'NeuronPoolCurve3crvExtendsRealization'];
export default deploy