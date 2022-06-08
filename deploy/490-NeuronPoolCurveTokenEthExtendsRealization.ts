import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { NeuronPoolCurveTokenEthExtends__factory } from '../typechain-types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy } = deployments
  const [deployer] = await ethers.getSigners()

  const NeuronPoolDeployment = await deploy<DeployArgs<NeuronPoolCurveTokenEthExtends__factory>>(
    'NeuronPoolCurveTokenEthExtendsRealization',
    {
      contract: 'NeuronPoolCurveTokenEthExtends',
      from: deployer.address,
    }
  )
}

deploy.tags = ['NeuronPoolCurveTokenEthExtendsRealization']
export default deploy
