import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { NeuronPoolCurveSBTC__factory } from '../typechain-types'
import { Controller, IStrategy } from '../typechain-types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy, get } = deployments
  const [deployer] = await ethers.getSigners()

  const ControllerDeployment = await get('Controller')
  const controller = (await ethers.getContractAt('Controller', ControllerDeployment.address)) as Controller
  const StrategyConvexCurveSBTCDeployment = await get('StrategyConvexCurveSBTC')
  const strategyConvexCurveSBTC = (await ethers.getContractAt(
    'IStrategy',
    StrategyConvexCurveSBTCDeployment.address
  )) as IStrategy

  const NeuronPoolDeployment = await deploy<DeployArgs<NeuronPoolCurveSBTC__factory>>('NeuronPoolCurveSBTC', {
    contract: 'NeuronPoolCurveSBTC',
    from: deployer.address,
    args: [
      await strategyConvexCurveSBTC.want(),
      deployer.address,
      deployer.address,
      ControllerDeployment.address,
    ],
  })

  await controller.setNPool(await strategyConvexCurveSBTC.want(), NeuronPoolDeployment.address)
  await controller.approveStrategy(await strategyConvexCurveSBTC.want(), strategyConvexCurveSBTC.address)
  await controller.setStrategy(await strategyConvexCurveSBTC.want(), strategyConvexCurveSBTC.address)
}

deploy.tags = ['NeuronPoolCurveSBTC']
deploy.dependencies = ['Controller', 'StrategyConvexCurveSBTC']
export default deploy
