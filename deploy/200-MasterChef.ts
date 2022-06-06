import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { parseEther } from 'ethers/lib/utils'
import { MasterChef__factory, NeuronToken } from '../typechain-types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy, get } = deployments
  const [deployer, dev, treasury] = await ethers.getSigners()

  const NeuronTokenDeployed = await get('NeuronToken')
  const neuronToken = (await ethers.getContractAt('NeuronToken', NeuronTokenDeployed.address)) as NeuronToken

  const neuronsPerBlock = parseEther('0.3')
  const startBlock = 0
  const bonusEndBlock = 0

  const MasterChefDeployed = await deploy<DeployArgs<MasterChef__factory>>('MasterChef', {
    from: deployer.address,
    args: [
      neuronToken.address,
      await deployer.getAddress(),
      await dev.getAddress(),
      await treasury.getAddress(),
      neuronsPerBlock,
      startBlock,
      bonusEndBlock,
    ],
  })

  await neuronToken.setMinter(MasterChefDeployed.address)
  await neuronToken.applyMinter()
  await neuronToken.setMinter(deployer.address)
  await neuronToken.applyMinter()
}

deploy.tags = ['MasterChef']
deploy.dependencies = ['NeuronToken']
export default deploy
