import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { Controller, IStrategy, NeuronPoolStabilityPoolLUSD__factory } from '../typechain-types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy, get } = deployments
  const [deployer] = await ethers.getSigners()

  const ControllerDeployment = await get('Controller')
  const controller = (await ethers.getContractAt('Controller', ControllerDeployment.address)) as Controller
  const StrategyStabilityPoolLUSDDeployment = await get('StrategyStabilityPoolLUSD')
  const strategyStabilityPoolLUSD = (await ethers.getContractAt(
    'IStrategy',
    StrategyStabilityPoolLUSDDeployment.address
  )) as IStrategy

  const NeuronPoolDeployment = await deploy<DeployArgs<NeuronPoolStabilityPoolLUSD__factory>>('NeuronPoolStabilityPoolLUSD', {
    contract: 'NeuronPoolStabilityPoolLUSD',
    from: deployer.address,
    args: [
      await strategyStabilityPoolLUSD.want(),
      deployer.address,
      deployer.address,
      ControllerDeployment.address,
    ],
  })

  await controller.setNPool(await strategyStabilityPoolLUSD.want(), NeuronPoolDeployment.address)
  await controller.approveStrategy(await strategyStabilityPoolLUSD.want(), strategyStabilityPoolLUSD.address)
  await controller.setStrategy(await strategyStabilityPoolLUSD.want(), strategyStabilityPoolLUSD.address)
}

deploy.tags = ['NeuronPoolStabilityPoolLUSD']
deploy.dependencies = ['Controller', 'StrategyStabilityPoolLUSD']
export default deploy
