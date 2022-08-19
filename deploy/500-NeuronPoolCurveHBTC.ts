import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { Controller, IStrategy, NeuronPoolCurveDoublePoolExtends__factory } from '../typechain-types'
import { CURVE_HBTC_POOL, HBTC, WBTC } from '../constants/addresses'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy, get } = deployments
  const [deployer] = await ethers.getSigners()

  const MasterChefDeployment = await get('MasterChef')
  const ControllerDeployment = await get('Controller')
  const controller = (await ethers.getContractAt('Controller', ControllerDeployment.address)) as Controller
  const StrategyConvexCurveHBTCDeployment = await get('StrategyConvexCurveHBTC')
  const strategyConvexCurveHBTC = (await ethers.getContractAt(
    'IStrategy',
    StrategyConvexCurveHBTCDeployment.address
  )) as IStrategy
  const NeuronPoolCurveDoublePoolExtendsRealizationDeployment = await get('NeuronPoolCurveDoublePoolExtendsRealization')

  const factory = (await ethers.getContractFactory(
    'NeuronPoolCurveDoublePoolExtends'
  )) as NeuronPoolCurveDoublePoolExtends__factory

  const data = factory.interface.encodeFunctionData('initialize', [
    await strategyConvexCurveHBTC.want(),
    deployer.address,
    deployer.address,
    ControllerDeployment.address,
    MasterChefDeployment.address,
    CURVE_HBTC_POOL,
    HBTC,
    WBTC,
  ])

  const NeuronPoolDeployment = await deploy('NeuronPoolCurveHBTC', {
    from: deployer.address,
    contract: 'ERC1967Proxy',
    args: [NeuronPoolCurveDoublePoolExtendsRealizationDeployment.address, data],
  })

  await controller.setNPool(await strategyConvexCurveHBTC.want(), NeuronPoolDeployment.address)
  await controller.approveStrategy(await strategyConvexCurveHBTC.want(), strategyConvexCurveHBTC.address)
  await controller.setStrategy(await strategyConvexCurveHBTC.want(), strategyConvexCurveHBTC.address)
}

deploy.tags = ['NeuronPoolCurveHBTC']
deploy.dependencies = [
  'MasterChef',
  'Controller',
  'StrategyConvexCurveHBTC',
  'NeuronPoolCurveDoublePoolExtendsRealization',
]
export default deploy
