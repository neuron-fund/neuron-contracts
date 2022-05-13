import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { NeuronPoolCurve3crvExtendsPricer__factory } from '../typechain-types';


const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre;
  const { deploy, get } = deployments;
  const [deployer] = await ethers.getSigners();

  const NeuronPoolCurve3crvExtendsPricerDeployment = await get('NeuronPoolCurve3crvExtendsPricer');
  const NeuronPoolCurveUSDPDeployment = await get('NeuronPoolCurveUSDP');
  const CRV3PricerDeployment = await get('CRV3Pricer');

  const factory = await ethers.getContractFactory('NeuronPoolCurve3crvExtendsPricer') as NeuronPoolCurve3crvExtendsPricer__factory;
  const data = factory.interface.encodeFunctionData('initialize', [
    NeuronPoolCurveUSDPDeployment.address,
    CRV3PricerDeployment.address,
    '0x42d7025938bEc20B69cBae5A77421082407f053A',
    '0x09023c0DA49Aaf8fc3fA3ADF34C6A7016D38D5e3',
    18
  ]);

  await deploy('NeuronPoolCurveUSDPPricer', {
    from: deployer.address,
    contract: 'ERC1967Proxy',
    args: [
      NeuronPoolCurve3crvExtendsPricerDeployment.address,
      data
    ],
  });
};

deploy.tags = ['NeuronPoolCurveUSDPPricer'];
deploy.dependencies = ['CRV3Pricer', 'NeuronPoolCurveUSDP', 'NeuronPoolCurve3crvExtendsPricer'];
export default deploy;