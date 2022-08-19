import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { Controller, IStrategy, NeuronPoolCurveDoublePoolExtends__factory } from '../typechain-types'
import { CURVE_REN_POOL, RENBTC, WBTC } from '../constants/addresses'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy, get } = deployments
  const [deployer] = await ethers.getSigners()

  const ControllerDeployment = await get('Controller')
  const controller = (await ethers.getContractAt('Controller', ControllerDeployment.address)) as Controller
  const StrategyConvexCurveRenDeployment = await get('StrategyConvexCurveRen')
  const strategyConvexCurveRen = (await ethers.getContractAt(
    'IStrategy',
    StrategyConvexCurveRenDeployment.address
  )) as IStrategy
  const NeuronPoolCurveDoublePoolExtendsRealizationDeployment = await get('NeuronPoolCurveDoublePoolExtendsRealization')

  const factory = (await ethers.getContractFactory(
    'NeuronPoolCurveDoublePoolExtends'
  )) as NeuronPoolCurveDoublePoolExtends__factory

  const data = factory.interface.encodeFunctionData('initialize', [
    await strategyConvexCurveRen.want(),
    deployer.address,
    deployer.address,
    ControllerDeployment.address,
    CURVE_REN_POOL,
    RENBTC,
    WBTC,
  ])

  const NeuronPoolDeployment = await deploy('NeuronPoolCurveRen', {
    from: deployer.address,
    contract: 'ERC1967Proxy',
    args: [NeuronPoolCurveDoublePoolExtendsRealizationDeployment.address, data],
  })

  await controller.setNPool(await strategyConvexCurveRen.want(), NeuronPoolDeployment.address)
  await controller.approveStrategy(await strategyConvexCurveRen.want(), strategyConvexCurveRen.address)
  await controller.setStrategy(await strategyConvexCurveRen.want(), strategyConvexCurveRen.address)
}

deploy.tags = ['NeuronPoolCurveRen']
deploy.dependencies = [
  'Controller',
  'StrategyConvexCurveRen',
  'NeuronPoolCurveDoublePoolExtendsRealization',
]
export default deploy
