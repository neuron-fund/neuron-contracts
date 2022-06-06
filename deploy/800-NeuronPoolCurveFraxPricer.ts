import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { NeuronPoolCurve3crvExtendsPricer__factory } from '../typechain-types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy, get } = deployments
  const [deployer] = await ethers.getSigners()

  const NeuronPoolCurve3crvExtendsPricerDeployment = await get('NeuronPoolCurve3crvExtendsPricer')
  const NeuronPoolCurveFraxDeployment = await get('NeuronPoolCurveFrax')
  const CRV3PricerDeployment = await get('CRV3Pricer')

  const factory = (await ethers.getContractFactory(
    'NeuronPoolCurve3crvExtendsPricer'
  )) as NeuronPoolCurve3crvExtendsPricer__factory
  const data = factory.interface.encodeFunctionData('initialize', [
    NeuronPoolCurveFraxDeployment.address,
    CRV3PricerDeployment.address,
    '0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B',
    '0xB9E1E3A9feFf48998E45Fa90847ed4D467E8BcfD',
    18,
  ])

  await deploy('NeuronPoolCurveFraxPricer', {
    from: deployer.address,
    contract: 'ERC1967Proxy',
    args: [NeuronPoolCurve3crvExtendsPricerDeployment.address, data],
  })
}

deploy.tags = ['NeuronPoolCurveFraxPricer']
deploy.dependencies = ['CRV3Pricer', 'NeuronPoolCurveFrax', 'NeuronPoolCurve3crvExtendsPricer']
export default deploy
