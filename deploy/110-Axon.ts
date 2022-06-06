import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { AxonVyper__factory } from '../typechain-types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy, get } = deployments
  const [deployer] = await ethers.getSigners()

  const NeuronTokenDeployment = await get('NeuronToken')

  await deploy<DeployArgs<AxonVyper__factory>>('Axon', {
    contract: 'AxonVyper',
    from: deployer.address,
    args: [NeuronTokenDeployment.address, 'veNEUR token', 'veNEUR', '1.0'],
  })
}

deploy.tags = ['Axon']
deploy.dependencies = ['NeuronToken']
export default deploy
