import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { IStrategy, Controller, NeuronPoolCurve3crvExtends__factory } from '../typechain-types'
import { FRAX, FRAX3CRV } from '../constants/addresses'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy, get } = deployments
  const [deployer] = await ethers.getSigners()

  const MasterChefDeployment = await get('MasterChef')
  const ControllerDeployment = await get('Controller')
  const controller = (await ethers.getContractAt('Controller', ControllerDeployment.address)) as Controller
  const StrategyConvexCurveFraxDeployment = await get('StrategyConvexCurveFrax')
  const strategyConvexCurveFrax = (await ethers.getContractAt(
    'IStrategy',
    StrategyConvexCurveFraxDeployment.address
  )) as IStrategy
  const NeuronPoolCurve3crvExtendsRealizationDeployment = await get('NeuronPoolCurve3crvExtendsRealization')

  const factory = (await ethers.getContractFactory('NeuronPoolCurve3crvExtends')) as NeuronPoolCurve3crvExtends__factory

  console.log(`await strategyConvexCurveFrax.want() ${await strategyConvexCurveFrax.want()}`)
  const data = factory.interface.encodeFunctionData('initialize', [
    await strategyConvexCurveFrax.want(),
    deployer.address,
    deployer.address,
    ControllerDeployment.address,
    MasterChefDeployment.address,
    FRAX3CRV,
    FRAX,
  ])

  const NeuronPoolDeployment = await deploy('NeuronPoolCurveFrax', {
    from: deployer.address,
    contract: 'ERC1967Proxy',
    args: [NeuronPoolCurve3crvExtendsRealizationDeployment.address, data],
  })

  await controller.setNPool(await strategyConvexCurveFrax.want(), NeuronPoolDeployment.address)
  await controller.approveStrategy(await strategyConvexCurveFrax.want(), strategyConvexCurveFrax.address)
  await controller.setStrategy(await strategyConvexCurveFrax.want(), strategyConvexCurveFrax.address)
}

deploy.tags = ['NeuronPoolCurveFrax']
deploy.dependencies = ['MasterChef', 'Controller', 'StrategyConvexCurveFrax', 'NeuronPoolCurve3crvExtendsRealization']
export default deploy
