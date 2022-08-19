import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { NeuronPoolCurveTokenEthExtendsPricer__factory } from '../typechain-types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy } = deployments
  const [deployer] = await ethers.getSigners()

  await deploy<DeployArgs<NeuronPoolCurveTokenEthExtendsPricer__factory>>('NeuronPoolCurveTokenEthExtendsPricer', {
    from: deployer.address,
    args: [],
  })
}

deploy.tags = ['NeuronPoolCurveTokenEthExtendsPricer']
export default deploy
