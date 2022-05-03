import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { NeuronPoolCurve3crvExtendsPricer__factory } from '../typechain-types';


const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre;
  const { deploy, get } = deployments;
  const [deployer] = await ethers.getSigners();

  const NeuronPoolCurve3crvExtendsPricerDeployment = await get('NeuronPoolCurve3crvExtendsPricer');
  const NeuronPoolCurveMIMDeployment = await get('NeuronPoolCurveMIM');
  const CRV3PricerDeployment = await get('CRV3Pricer');

  const factory = await ethers.getContractFactory('NeuronPoolCurve3crvExtendsPricer') as NeuronPoolCurve3crvExtendsPricer__factory;
  const data = factory.interface.encodeFunctionData('initialize', [
    NeuronPoolCurveMIMDeployment.address,
    CRV3PricerDeployment.address,
    '0x5a6A4D54456819380173272A5E8E9B9904BdF41B',
    '0x7A364e8770418566e3eb2001A96116E6138Eb32F'
  ]);

  await deploy('NeuronPoolCurveMIMPricer', {
    from: deployer.address,
    contract: 'ERC1967Proxy',
    args: [
      NeuronPoolCurve3crvExtendsPricerDeployment.address,
      data,
    ],
  });
};

deploy.tags = ['NeuronPoolCurveMIMPricer'];
deploy.dependencies = ['CRV3Pricer', 'NeuronPoolCurveMIM', 'NeuronPoolCurve3crvExtendsPricer'];
export default deploy;