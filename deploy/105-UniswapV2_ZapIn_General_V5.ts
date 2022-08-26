import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { NeuronLiquidityPoolZapIn__factory } from '../typechain-types'
import { UNISWAP_FACTORY_V2, UNISWAP_ROUTER_V2, WETH } from '../constants/addresses'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy } = deployments
  const deployer = (await ethers.getSigners())[0]

  await deploy<DeployArgs<NeuronLiquidityPoolZapIn__factory>>('NeuronLiquidityPoolZapIn', {
    from: deployer.address,
    args: [UNISWAP_FACTORY_V2, UNISWAP_ROUTER_V2, WETH],
  })
}

deploy.tags = ['NeuronLiquidityPoolZapIn']
export default deploy
