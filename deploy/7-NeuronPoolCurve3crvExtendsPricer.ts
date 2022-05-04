import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { NeuronPoolCurve3crvExtendsPricer__factory } from '../typechain-types';


const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre;
  const { deploy } = deployments;
  const [deployer] = await ethers.getSigners();

  await deploy<DeployArgs<NeuronPoolCurve3crvExtendsPricer__factory>>('NeuronPoolCurve3crvExtendsPricer', {
    from: deployer.address,
    args: [],
  });
};

deploy.tags = ['NeuronPoolCurve3crvExtendsPricer'];
export default deploy;