import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { Controller, IStrategy, NeuronPoolCurve3crvExtends__factory } from '../typechain-types'
import { LUSD, LUSD3CRV } from '../constants/addresses'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy, get } = deployments
  const [deployer] = await ethers.getSigners()

  const MasterChefDeployment = await get('MasterChef')
  const ControllerDeployment = await get('Controller')
  const controller = (await ethers.getContractAt('Controller', ControllerDeployment.address)) as Controller
  const StrategyStabilityPoolLUSDDeployment = await get('StrategyStabilityPoolLUSD')
  const strategyStabilityPoolLUSD = (await ethers.getContractAt(
    'IStrategy',
    StrategyStabilityPoolLUSDDeployment.address
  )) as IStrategy

  const NeuronPoolCurve3crvExtendsRealizationDeployment = await get('NeuronPoolCurve3crvExtendsRealization')

  const factory = (await ethers.getContractFactory('NeuronPoolCurve3crvExtends')) as NeuronPoolCurve3crvExtends__factory

  const data = factory.interface.encodeFunctionData('initialize', [
    await strategyStabilityPoolLUSD.want(),
    deployer.address,
    deployer.address,
    ControllerDeployment.address,
    MasterChefDeployment.address,
    LUSD3CRV,
    LUSD,
  ])

  const NeuronPoolDeployment = await deploy('NeuronPoolCurveLUSD', {
    from: deployer.address,
    contract: 'ERC1967Proxy',
    args: [NeuronPoolCurve3crvExtendsRealizationDeployment.address, data],
  })

  await controller.setNPool(await strategyStabilityPoolLUSD.want(), NeuronPoolDeployment.address)
  await controller.approveStrategy(await strategyStabilityPoolLUSD.want(), strategyStabilityPoolLUSD.address)
  await controller.setStrategy(await strategyStabilityPoolLUSD.want(), strategyStabilityPoolLUSD.address)
}

deploy.tags = ['NeuronPoolCurveLUSD']
deploy.dependencies = ['MasterChef', 'Controller', 'StrategyStabilityPoolLUSD', 'NeuronPoolCurve3crvExtendsRealization']
export default deploy
