import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { NeuronPoolCurve3crvExtendsPricer__factory } from '../typechain-types';


const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre;
  const { deploy, get } = deployments;
  const [deployer] = await ethers.getSigners();

  const NeuronPoolCurve3crvExtendsPricerDeployment = await get('NeuronPoolCurve3crvExtendsPricer');
  const NeuronPoolCurveALUSDDeployment = await get('NeuronPoolCurveALUSD');
  const CRV3PricerDeployment = await get('CRV3Pricer');

  const factory = await ethers.getContractFactory('NeuronPoolCurve3crvExtendsPricer') as NeuronPoolCurve3crvExtendsPricer__factory;
  const data = factory.interface.encodeFunctionData('initialize', [
    NeuronPoolCurveALUSDDeployment.address,
    CRV3PricerDeployment.address,
    '0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c',
    '0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9'
  ]);

  await deploy('NeuronPoolCurveALUSDPricer', {
    from: deployer.address,
    contract: 'ERC1967Proxy',
    args: [
      NeuronPoolCurve3crvExtendsPricerDeployment.address,
      data,
    ],
  });
};

deploy.tags = ['NeuronPoolCurveALUSDPricer'];
deploy.dependencies = ['CRV3Pricer', 'NeuronPoolCurveALUSD', 'NeuronPoolCurve3crvExtendsPricer'];
export default deploy;