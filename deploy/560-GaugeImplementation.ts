import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { GaugeImplementation__factory } from '../typechain-types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy } = deployments
  const [deployer] = await ethers.getSigners()

  await deploy<DeployArgs<GaugeImplementation__factory>>('GaugeImplementation', {
    contract: 'GaugeImplementation',
    from: deployer.address,
  })
}

deploy.tags = ['GaugeImplementation']
export default deploy
