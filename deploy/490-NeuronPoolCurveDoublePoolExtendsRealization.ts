import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { NeuronPoolCurveDoublePoolExtends__factory } from '../typechain-types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy } = deployments
  const [deployer] = await ethers.getSigners()

  const NeuronPoolDeployment = await deploy<DeployArgs<NeuronPoolCurveDoublePoolExtends__factory>>(
    'NeuronPoolCurveDoublePoolExtendsRealization',
    {
      contract: 'NeuronPoolCurveDoublePoolExtends',
      from: deployer.address,
    }
  )
}

deploy.tags = ['NeuronPoolCurveDoublePoolExtendsRealization']
export default deploy
