import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { Controller, IStrategy, NeuronPoolCurveTokenEthExtends__factory } from '../typechain-types'
import { CURVE_STETH_POOL, STETH } from '../constants/addresses'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy, get } = deployments
  const [deployer] = await ethers.getSigners()

  const MasterChefDeployment = await get('MasterChef')
  const ControllerDeployment = await get('Controller')
  const controller = (await ethers.getContractAt('Controller', ControllerDeployment.address)) as Controller
  const StrategyConvexCurveSTETHDeployment = await get('StrategyConvexCurveSTETH')
  const strategyConvexCurveSTETH = (await ethers.getContractAt(
    'IStrategy',
    StrategyConvexCurveSTETHDeployment.address
  )) as IStrategy
  const NeuronPoolCurveTokenEthExtendsRealizationDeployment = await get('NeuronPoolCurveTokenEthExtendsRealization')

  const factory = (await ethers.getContractFactory(
    'NeuronPoolCurveTokenEthExtends'
  )) as NeuronPoolCurveTokenEthExtends__factory

  const data = factory.interface.encodeFunctionData('initialize', [
    await strategyConvexCurveSTETH.want(),
    deployer.address,
    deployer.address,
    ControllerDeployment.address,
    MasterChefDeployment.address,
    CURVE_STETH_POOL,
    STETH,
  ])

  const NeuronPoolDeployment = await deploy('NeuronPoolCurveSTETH', {
    from: deployer.address,
    contract: 'ERC1967Proxy',
    args: [NeuronPoolCurveTokenEthExtendsRealizationDeployment.address, data],
  })

  await controller.setNPool(await strategyConvexCurveSTETH.want(), NeuronPoolDeployment.address)
  await controller.approveStrategy(await strategyConvexCurveSTETH.want(), strategyConvexCurveSTETH.address)
  await controller.setStrategy(await strategyConvexCurveSTETH.want(), strategyConvexCurveSTETH.address)
}

deploy.tags = ['NeuronPoolCurveSTETH']
deploy.dependencies = [
  'MasterChef',
  'Controller',
  'StrategyConvexCurveSTETH',
  'NeuronPoolCurveTokenEthExtendsRealization',
]
export default deploy
