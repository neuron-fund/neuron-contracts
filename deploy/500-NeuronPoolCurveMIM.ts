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
  const StrategyConvexCurveMIMDeployment = await get('StrategyConvexCurveMIM');
  const strategyConvexCurveMIM = await ethers.getContractAt('IStrategy', StrategyConvexCurveMIMDeployment.address) as IStrategy;
  const NeuronPoolCurve3crvExtendsRealizationDeployment = await get('NeuronPoolCurve3crvExtendsRealization');

  const factory = await ethers.getContractFactory('NeuronPoolCurve3crvExtends') as NeuronPoolCurve3crvExtends__factory;

  const data = factory.interface.encodeFunctionData('initialize', [
    await strategyConvexCurveMIM.want(),
    deployer.address,
    deployer.address,
    ControllerDeployment.address,
    MasterChefDeployment.address,
    '0x5a6A4D54456819380173272A5E8E9B9904BdF41B',
    '0x99D8a9C45b2ecA8864373A26D1459e3Dff1e17F3',
  ]);

  const NeuronPoolDeployment = await deploy('NeuronPoolCurveMIM', {
    from: deployer.address,
    contract: 'ERC1967Proxy',
    args: [
      NeuronPoolCurve3crvExtendsRealizationDeployment.address,
      data,
    ],
  });

  await controller.setNPool(await strategyConvexCurveMIM.want(), strategyConvexCurveMIM.address);
  await controller.approveStrategy(await strategyConvexCurveMIM.want(), strategyConvexCurveMIM.address);
  await controller.setStrategy(await strategyConvexCurveMIM.want(), strategyConvexCurveMIM.address);
};

deploy.tags = ['NeuronPoolCurveMIM']
deploy.dependencies = ['MasterChef', 'Controller', 'StrategyConvexCurveMIM', 'NeuronPoolCurve3crvExtendsRealization'];
export default deploy