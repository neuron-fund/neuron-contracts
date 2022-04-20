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
  const MockStrategyCurveFraxDeployment = await get('MockStrategyCurveFrax');
  const mockStrategyCurveFrax = await ethers.getContractAt('MockStrategy', MockStrategyCurveFraxDeployment.address) as MockStrategy;

  const NeuronPoolDeployment = await deploy<DeployArgs<NeuronPoolCurve3crvExtends__factory>>('NeuronPoolCurveFrax', {
    contract: 'NeuronPoolCurve3crvExtends',
    from: deploer.address,
    args: [
      await mockStrategyCurveFrax.want(),
      deploer.address,
      deploer.address,
      ControllerDeployment.address,
      MasterChefDeployment.address,
      '0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B',
      '0x853d955aCEf822Db058eb8505911ED77F175b99e'
    ],
  });

  await controller.setNPool(await mockStrategyCurveFrax.want(), NeuronPoolDeployment.address);
  await controller.approveStrategy(await mockStrategyCurveFrax.want(), mockStrategyCurveFrax.address);
  await controller.setStrategy(await mockStrategyCurveFrax.want(), mockStrategyCurveFrax.address);
};

deploy.tags = ['NeuronPoolCurveFrax']
deploy.dependencies = ['MasterChef', 'Controller', 'MockStrategyCurveFrax'];
export default deploy