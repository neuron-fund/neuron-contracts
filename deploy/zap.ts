import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { NeuronZap__factory } from '../typechain-types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy } = deployments
  const signer = (await ethers.getSigners())[0]

  await deploy<DeployArgs<NeuronZap__factory>>('NeuronZap', {
    from: signer.address,
    proxy: true,
  })
}

deploy.tags = ['zap']
export default deploy
