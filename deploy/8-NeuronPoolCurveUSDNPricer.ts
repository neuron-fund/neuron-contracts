import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { NeuronPoolCurve3crvExtendsPricer__factory } from '../typechain-types';


const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre;
  const { deploy, get } = deployments;
  const [deployer] = await ethers.getSigners();

  const NeuronPoolCurve3crvExtendsPricerDeployment = await get('NeuronPoolCurve3crvExtendsPricer');
  const NeuronPoolCurveUSDNDeployment = await get('NeuronPoolCurveUSDN');
  const CRV3PricerDeployment = await get('CRV3Pricer');

  const factory = await ethers.getContractFactory('NeuronPoolCurve3crvExtendsPricer') as NeuronPoolCurve3crvExtendsPricer__factory;
  const data = factory.interface.encodeFunctionData('initialize', [
    NeuronPoolCurveUSDNDeployment.address,
    CRV3PricerDeployment.address,
    '0x0f9cb53Ebe405d49A0bbdBD291A65Ff571bC83e1',
    '0x7a8544894F7FD0C69cFcBE2b4b2E277B0b9a4355'
  ]);

  await deploy('NeuronPoolCurveUSDNPricer', {
    from: deployer.address,
    contract: 'ERC1967Proxy',
    args: [
      NeuronPoolCurve3crvExtendsPricerDeployment.address,
      data,
    ],
  });
};

deploy.tags = ['NeuronPoolCurveUSDNPricer'];
deploy.dependencies = ['CRV3Pricer', 'NeuronPoolCurveUSDN', 'NeuronPoolCurve3crvExtendsPricer'];
export default deploy;