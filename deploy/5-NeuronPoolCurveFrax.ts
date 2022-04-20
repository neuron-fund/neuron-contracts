import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { Controller, MockStrategy } from '../typechain'
import { DeployArgs } from '../types'
import { NeuronPoolCurve3crvExtends__factory } from '../typechain-types';


const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre;
  const { deploy, get } = deployments;
  const [deployer] = await ethers.getSigners();

  const MasterChefDeployment = await get('MasterChef');
  const ControllerDeployment = await get('Controller');
  const controller = await ethers.getContractAt('Controller', ControllerDeployment.address) as Controller;
  const MockStrategyCurveFraxDeployment = await get('MockStrategyCurveFrax');
  const mockStrategyCurveFrax = await ethers.getContractAt('MockStrategy', MockStrategyCurveFraxDeployment.address) as MockStrategy;
  const NeuronPoolCurve3crvExtendsRealizationDeployment = await get('NeuronPoolCurve3crvExtendsRealization');

  const factory = await ethers.getContractFactory('NeuronPoolCurve3crvExtends') as NeuronPoolCurve3crvExtends__factory;

  const data = factory.interface.encodeFunctionData('initialize', [
    await mockStrategyCurveFrax.want(),
      deployer.address,
      deployer.address,
      ControllerDeployment.address,
      MasterChefDeployment.address,
      '0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B',
      '0x853d955aCEf822Db058eb8505911ED77F175b99e'
  ]);

  const NeuronPoolDeployment = await deploy('NeuronPoolCurveFrax', {
    from: deployer.address,
    contract: 'ERC1967Proxy',
    args: [
      NeuronPoolCurve3crvExtendsRealizationDeployment.address,
      data,
    ],
  });

  await controller.setNPool(await mockStrategyCurveFrax.want(), NeuronPoolDeployment.address);
  await controller.approveStrategy(await mockStrategyCurveFrax.want(), mockStrategyCurveFrax.address);
  await controller.setStrategy(await mockStrategyCurveFrax.want(), mockStrategyCurveFrax.address);
};

deploy.tags = ['NeuronPoolCurveFrax']
deploy.dependencies = ['MasterChef', 'Controller', 'MockStrategyCurveFrax', 'NeuronPoolCurve3crvExtendsRealization'];
export default deploy