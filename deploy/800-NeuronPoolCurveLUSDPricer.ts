import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { NeuronPoolCurveLUSDPricer__factory } from '../typechain-types/factories/contracts/pricers/NeuronPoolCurveLUSDPricer__factory';


const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre;
  const { deploy, get } = deployments;
  const [deployer] = await ethers.getSigners();

  const NeuronPoolCurveLUSDDeployment = await get('NeuronPoolCurveLUSD');
  const CRV3PricerDeployment = await get('CRV3Pricer');

  await deploy<DeployArgs<NeuronPoolCurveLUSDPricer__factory>>('NeuronPoolCurveLUSDPricer', {
    from: deployer.address,
    args: [
      NeuronPoolCurveLUSDDeployment.address,
      CRV3PricerDeployment.address,
      18
    ],
  });
};

deploy.tags = ['NeuronPoolCurveLUSDPricer'];
deploy.dependencies = ['CRV3Pricer', 'NeuronPoolCurveLUSD'];
export default deploy;