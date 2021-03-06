import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { NeuronPoolCurve3crvExtendsPricer__factory, Oracle__factory } from '../typechain-types'
import { CHAINLINK_FRAXUSD, FRAX, FRAX3CRV } from '../constants/addresses'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy, get } = deployments
  const [deployer] = await ethers.getSigners()

  const NeuronPoolCurve3crvExtendsPricerDeployment = await get('NeuronPoolCurve3crvExtendsPricer')
  const NeuronPoolCurveFraxDeployment = await get('NeuronPoolCurveFrax')
  const CRV3PricerDeployment = await get('CRV3Pricer')
  const OracleDeployment = await get('Oracle')

  const factory = (await ethers.getContractFactory(
    'NeuronPoolCurve3crvExtendsPricer'
  )) as NeuronPoolCurve3crvExtendsPricer__factory

  const data = factory.interface.encodeFunctionData('initialize', [
    NeuronPoolCurveFraxDeployment.address,
    CRV3PricerDeployment.address,
    FRAX3CRV,
    FRAX,
    18,
    OracleDeployment.address
  ])

  const PricerDeployment = await deploy('NeuronPoolCurveFraxPricer', {
    from: deployer.address,
    contract: 'ERC1967Proxy',
    args: [NeuronPoolCurve3crvExtendsPricerDeployment.address, data],
  })

  const oracle = Oracle__factory.connect(OracleDeployment.address, deployer)
  await oracle.setAssetPricer(NeuronPoolCurveFraxDeployment.address, PricerDeployment.address)
}

deploy.tags = ['NeuronPoolCurveFraxPricer']
deploy.dependencies = ['Oracle', 'CRV3Pricer', 'ChainLinkPricerFrax', 'NeuronPoolCurveFrax', 'NeuronPoolCurve3crvExtendsPricer']
export default deploy
