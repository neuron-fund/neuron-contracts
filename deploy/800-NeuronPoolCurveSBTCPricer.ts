import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { NeuronPoolCurveSBTCPricer__factory, Oracle__factory } from '../typechain-types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy, get } = deployments
  const [deployer] = await ethers.getSigners()

  const OracleDeployment = await get('Oracle')
  const NeuronPoolCurveSBTCDeployment = await get('NeuronPoolCurveSBTC')

  const PricerDeployment = await deploy<DeployArgs<NeuronPoolCurveSBTCPricer__factory>>('NeuronPoolCurveSBTCPricer', {
    from: deployer.address,
    args: [NeuronPoolCurveSBTCDeployment.address, 18, OracleDeployment.address],
  })

  const oracle = Oracle__factory.connect(OracleDeployment.address, deployer)
  await oracle.setAssetPricer(NeuronPoolCurveSBTCDeployment.address, PricerDeployment.address)
}

deploy.tags = ['NeuronPoolCurveSBTCPricer']
deploy.dependencies = ['Oracle', 'NeuronPoolCurveSBTC', 'ChainLinkPricerWBTC']
export default deploy
