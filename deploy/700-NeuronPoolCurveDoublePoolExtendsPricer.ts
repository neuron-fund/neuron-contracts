import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { NeuronPoolCurveDoublePoolExtendsPricer__factory } from '../typechain-types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy } = deployments
  const [deployer] = await ethers.getSigners()

  await deploy<DeployArgs<NeuronPoolCurveDoublePoolExtendsPricer__factory>>('NeuronPoolCurveDoublePoolExtendsPricer', {
    from: deployer.address,
    args: [],
  })
}

deploy.tags = ['NeuronPoolCurveDoublePoolExtendsPricer']
export default deploy
