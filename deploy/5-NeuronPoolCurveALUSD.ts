import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { Controller, MockStrategy } from '../typechain'
import { DeployArgs } from '../types'
import { NeuronPoolCurve3crvExtends__factory } from '../typechain-types';

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre;
  const { deploy, get } = deployments;
  const [deploer] = await ethers.getSigners();

  const MasterChefDeployment = await get('MasterChef');
  const ControllerDeployment = await get('Controller');
  const controller = await ethers.getContractAt('Controller', ControllerDeployment.address) as Controller;
  const MockStrategyCurveALUSDDeployment = await get('MockStrategyCurveALUSD');
  const mockStrategyCurveALUSD = await ethers.getContractAt('MockStrategy', MockStrategyCurveALUSDDeployment.address) as MockStrategy;

  const NeuronPoolDeployment = await deploy<DeployArgs<NeuronPoolCurve3crvExtends__factory>>('NeuronPoolCurveALUSD', {
    contract: 'NeuronPoolCurve3crvExtends',
    from: deploer.address,
    args: [
      await mockStrategyCurveALUSD.want(),
      deploer.address,
      deploer.address,
      ControllerDeployment.address,
      MasterChefDeployment.address,
      '0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c',
      '0xBC6DA0FE9aD5f3b0d58160288917AA56653660E9'
    ],
  });

  await controller.setNPool(await mockStrategyCurveALUSD.want(), mockStrategyCurveALUSD.address);
  await controller.approveStrategy(await mockStrategyCurveALUSD.want(), mockStrategyCurveALUSD.address);
  await controller.setStrategy(await mockStrategyCurveALUSD.want(), mockStrategyCurveALUSD.address);
};

deploy.tags = ['NeuronPoolCurveALUSD']
deploy.dependencies = ['MasterChef', 'Controller', 'MockStrategyCurveALUSD'];
export default deploy