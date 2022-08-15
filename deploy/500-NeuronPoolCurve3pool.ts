import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { NeuronPoolCurve3pool__factory } from '../typechain-types'
import { Controller, IStrategy } from '../typechain-types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy, get } = deployments
  const [deployer] = await ethers.getSigners()

  const ControllerDeployment = await get('Controller')
  const controller = (await ethers.getContractAt('Controller', ControllerDeployment.address)) as Controller
  const StrategyConvexCurve3PoolDeployment = await get('StrategyConvexCurve3Pool')
  const strategyConvexCurve3pool = (await ethers.getContractAt(
    'IStrategy',
    StrategyConvexCurve3PoolDeployment.address
  )) as IStrategy

  const NeuronPoolDeployment = await deploy<DeployArgs<NeuronPoolCurve3pool__factory>>('NeuronPoolCurve3pool', {
    contract: 'NeuronPoolCurve3pool',
    from: deployer.address,
    args: [
      await strategyConvexCurve3pool.want(),
      deployer.address,
      deployer.address,
      ControllerDeployment.address,
    ],
  })

  await controller.setNPool(await strategyConvexCurve3pool.want(), NeuronPoolDeployment.address)
  await controller.approveStrategy(await strategyConvexCurve3pool.want(), strategyConvexCurve3pool.address)
  await controller.setStrategy(await strategyConvexCurve3pool.want(), strategyConvexCurve3pool.address)
}

deploy.tags = ['NeuronPoolCurve3pool']
deploy.dependencies = ['Controller', 'StrategyConvexCurve3Pool']
export default deploy
