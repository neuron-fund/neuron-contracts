import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { NeuronPoolCurvePricer__factory } from '../typechain-types';


const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre;
  const { deploy, get } = deployments;
  const [deployer] = await ethers.getSigners();


 await deploy<DeployArgs<NeuronPoolCurvePricer__factory>>('NeuronPoolCurvePricer', {
    from: deployer.address,
    args: [],
  });
};

deploy.tags = ['NeuronPoolCurvePricer'];
export default deploy;