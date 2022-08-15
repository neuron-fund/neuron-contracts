import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { Controller, IStrategy, NeuronPoolCurveTokenEthExtends__factory } from '../typechain-types'
import { CURVE_ALETH_POOL, ALETH } from '../constants/addresses'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy, get } = deployments
  const [deployer] = await ethers.getSigners()

  const ControllerDeployment = await get('Controller')
  const controller = (await ethers.getContractAt('Controller', ControllerDeployment.address)) as Controller
  const StrategyConvexCurveALETHDeployment = await get('StrategyConvexCurveALETH')
  const strategyConvexCurveALETH = (await ethers.getContractAt(
    'IStrategy',
    StrategyConvexCurveALETHDeployment.address
  )) as IStrategy
  const NeuronPoolCurveTokenEthExtendsRealizationDeployment = await get('NeuronPoolCurveTokenEthExtendsRealization')

  const factory = (await ethers.getContractFactory(
    'NeuronPoolCurveTokenEthExtends'
  )) as NeuronPoolCurveTokenEthExtends__factory

  const data = factory.interface.encodeFunctionData('initialize', [
    await strategyConvexCurveALETH.want(),
    deployer.address,
    deployer.address,
    ControllerDeployment.address,
    CURVE_ALETH_POOL,
    ALETH,
  ])

  const NeuronPoolDeployment = await deploy('NeuronPoolCurveALETH', {
    from: deployer.address,
    contract: 'ERC1967Proxy',
    args: [NeuronPoolCurveTokenEthExtendsRealizationDeployment.address, data],
  })

  await controller.setNPool(await strategyConvexCurveALETH.want(), NeuronPoolDeployment.address)
  await controller.approveStrategy(await strategyConvexCurveALETH.want(), strategyConvexCurveALETH.address)
  await controller.setStrategy(await strategyConvexCurveALETH.want(), strategyConvexCurveALETH.address)
}

deploy.tags = ['NeuronPoolCurveALETH']
deploy.dependencies = [
  'Controller',
  'StrategyConvexCurveALETH',
  'NeuronPoolCurveTokenEthExtendsRealization',
]
export default deploy
