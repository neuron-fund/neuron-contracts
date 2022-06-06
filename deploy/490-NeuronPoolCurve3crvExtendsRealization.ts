import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { NeuronPoolCurve3crvExtends__factory } from '../typechain-types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy } = deployments
  const [deployer] = await ethers.getSigners()

  const NeuronPoolDeployment = await deploy<DeployArgs<NeuronPoolCurve3crvExtends__factory>>(
    'NeuronPoolCurve3crvExtendsRealization',
    {
      contract: 'NeuronPoolCurve3crvExtends',
      from: deployer.address,
    }
  )
}

deploy.tags = ['NeuronPoolCurve3crvExtendsRealization']
export default deploy
