import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { NeuronPoolCurveTokenEthExtendsPricer__factory, Oracle__factory } from '../typechain-types'
import { CHAINLINK_STETHUSD, CURVE_STETH_POOL, STETH } from '../constants/addresses'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy, get } = deployments
  const [deployer] = await ethers.getSigners()

  const NeuronPoolCurveTokenEthExtendsPricerDeployment = await get('NeuronPoolCurveTokenEthExtendsPricer')
  const NeuronPoolCurveSTETHDeployment = await get('NeuronPoolCurveSTETH')
  const OracleDeployment = await get('Oracle')

  const factory = (await ethers.getContractFactory(
    'NeuronPoolCurveTokenEthExtendsPricer'
  )) as NeuronPoolCurveTokenEthExtendsPricer__factory

  const data = factory.interface.encodeFunctionData('initialize', [
    NeuronPoolCurveSTETHDeployment.address,
    CURVE_STETH_POOL,
    STETH,
    18,
    OracleDeployment.address
  ])

  const PricerDeployment = await deploy('NeuronPoolCurveSTETHPricer', {
    from: deployer.address,
    contract: 'ERC1967Proxy',
    args: [NeuronPoolCurveTokenEthExtendsPricerDeployment.address, data],
  })

  const oracle = Oracle__factory.connect(OracleDeployment.address, deployer)
  await oracle.setAssetPricer(NeuronPoolCurveSTETHDeployment.address, PricerDeployment.address)
}

deploy.tags = ['NeuronPoolCurveSTETHPricer']
deploy.dependencies = ['Oracle', 'ChainLinkPricerSTETH', 'NeuronPoolCurveSTETH', 'NeuronPoolCurveTokenEthExtendsPricer']
export default deploy
