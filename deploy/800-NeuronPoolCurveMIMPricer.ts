import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { NeuronPoolCurve3crvExtendsPricer__factory, Oracle__factory } from '../typechain-types'
import { CHAINLINK_MIMUSD, MIM, MIM3CRV } from '../constants/addresses'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy, get } = deployments
  const [deployer] = await ethers.getSigners()

  const NeuronPoolCurve3crvExtendsPricerDeployment = await get('NeuronPoolCurve3crvExtendsPricer')
  const NeuronPoolCurveMIMDeployment = await get('NeuronPoolCurveMIM')
  const CRV3PricerDeployment = await get('CRV3Pricer')
  const OracleDeployment = await get('Oracle')

  const factory = (await ethers.getContractFactory(
    'NeuronPoolCurve3crvExtendsPricer'
  )) as NeuronPoolCurve3crvExtendsPricer__factory
  const data = factory.interface.encodeFunctionData('initialize', [
    NeuronPoolCurveMIMDeployment.address,
    CRV3PricerDeployment.address,
    MIM3CRV,
    MIM,
    18,
    OracleDeployment.address,
  ])

  const PricerDeployment = await deploy('NeuronPoolCurveMIMPricer', {
    from: deployer.address,
    contract: 'ERC1967Proxy',
    args: [NeuronPoolCurve3crvExtendsPricerDeployment.address, data],
  })

  const oracle = Oracle__factory.connect(OracleDeployment.address, deployer)
  const oracleOwnerAddress = await oracle.owner()
  const oracleOwner = await ethers.getSigner(oracleOwnerAddress)
  await oracle.connect(oracleOwner).setAssetPricer(NeuronPoolCurveMIMDeployment.address, PricerDeployment.address)
}

deploy.tags = ['NeuronPoolCurveMIMPricer']
deploy.dependencies = [
  'CRV3Pricer',
  'Oracle',
  'ChainLinkPricerMIM',
  'NeuronPoolCurveMIM',
  'NeuronPoolCurve3crvExtendsPricer',
]
export default deploy
