import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { NeuronPoolCurveMIMUSTPricer__factory } from '../typechain-types/factories/contracts/pricers/NeuronPoolCurveMIMUSTPricer__factory';


const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre;
  const { deploy, get } = deployments;
  const [deployer] = await ethers.getSigners();

  const NeuronPoolCurveMIMUSTDeployment = await get('NeuronPoolCurveMIMUST');

  await deploy<DeployArgs<NeuronPoolCurveMIMUSTPricer__factory>>('NeuronPoolCurveMIMUSTPricer', {
    from: deployer.address,
    args: [
      NeuronPoolCurveMIMUSTDeployment.address
    ],
  });
};

deploy.tags = ['NeuronPoolCurveMIMUSTPricer'];
deploy.dependencies = ['NeuronPoolCurveMIMUST'];
export default deploy;