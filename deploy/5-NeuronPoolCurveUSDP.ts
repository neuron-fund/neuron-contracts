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
  const MockStrategyCurveUSDPDeployment = await get('MockStrategyCurveUSDP');
  const mockStrategyCurveUSDP = await ethers.getContractAt('MockStrategy', MockStrategyCurveUSDPDeployment.address) as MockStrategy;

  const NeuronPoolDeployment = await deploy<DeployArgs<NeuronPoolCurve3crvExtends__factory>>('NeuronPoolCurveUSDP', {
    contract: 'NeuronPoolCurve3crvExtends',
    from: deploer.address,
    args: [
      await mockStrategyCurveUSDP.want(),
      deploer.address,
      deploer.address,
      ControllerDeployment.address,
      MasterChefDeployment.address,
      '0x42d7025938bEc20B69cBae5A77421082407f053A',
      '0x1456688345527bE1f37E9e627DA0837D6f08C925',
    ],
  });

  await controller.setNPool(await mockStrategyCurveUSDP.want(), mockStrategyCurveUSDP.address);
  await controller.approveStrategy(await mockStrategyCurveUSDP.want(), mockStrategyCurveUSDP.address);
  await controller.setStrategy(await mockStrategyCurveUSDP.want(), mockStrategyCurveUSDP.address);
};

deploy.tags = ['NeuronPoolCurveUSDP']
deploy.dependencies = ['MasterChef', 'Controller', 'MockStrategyCurveUSDP'];
export default deploy