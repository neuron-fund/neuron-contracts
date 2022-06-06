import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { GaugesDistributor__factory } from '../typechain-types'
import { BigNumber } from 'ethers'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy, get } = deployments
  const [deployer] = await ethers.getSigners()

  const MasterChefDeployment = await get('MasterChef')
  const NeuronTokenDeployment = await get('NeuronToken')
  const AxonDeployment = await get('Axon')

  await deploy<DeployArgs<GaugesDistributor__factory>>('GaugesDistributor', {
    contract: 'GaugesDistributor',
    from: deployer.address,
    args: [
      MasterChefDeployment.address,
      NeuronTokenDeployment.address,
      AxonDeployment.address,
      deployer.address,
      deployer.address,
    ],
  })
}

deploy.tags = ['GaugesDistributor']
deploy.dependencies = ['MasterChef', 'NeuronToken', 'Axon']
export default deploy
