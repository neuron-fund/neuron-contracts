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
  const StrategyConvexCurveFraxDeployment = await get('StrategyConvexCurveFrax');
  const strategyConvexCurveFrax = await ethers.getContractAt('MockStrategy', StrategyConvexCurveFraxDeployment.address) as MockStrategy;
  const NeuronPoolCurve3crvExtendsRealizationDeployment = await get('NeuronPoolCurve3crvExtendsRealization');

  const factory = await ethers.getContractFactory('NeuronPoolCurve3crvExtends') as NeuronPoolCurve3crvExtends__factory;

  const data = factory.interface.encodeFunctionData('initialize', [
    await strategyConvexCurveFrax.want(),
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

  await controller.setNPool(await strategyConvexCurveFrax.want(), NeuronPoolDeployment.address);
  await controller.approveStrategy(await strategyConvexCurveFrax.want(), strategyConvexCurveFrax.address);
  await controller.setStrategy(await strategyConvexCurveFrax.want(), strategyConvexCurveFrax.address);
};

deploy.tags = ['NeuronPoolCurveFrax']
deploy.dependencies = ['MasterChef', 'Controller', 'StrategyConvexCurveFrax', 'NeuronPoolCurve3crvExtendsRealization'];
export default deploy