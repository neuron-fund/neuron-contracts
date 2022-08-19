import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { NeuronPoolCurveALETHPricer__factory, Oracle__factory } from '../typechain-types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy, get } = deployments
  const [deployer] = await ethers.getSigners()

  const OracleDeployment = await get('Oracle')
  const NeuronPoolCurveALETHDeployment = await get('NeuronPoolCurveALETH')

  const PricerDeployment = await deploy<DeployArgs<NeuronPoolCurveALETHPricer__factory>>('NeuronPoolCurveALETHPricer', {
    from: deployer.address,
    args: [NeuronPoolCurveALETHDeployment.address, 18, OracleDeployment.address],
  })

  const oracle = Oracle__factory.connect(OracleDeployment.address, deployer)
  await oracle.setAssetPricer(NeuronPoolCurveALETHDeployment.address, PricerDeployment.address)
}

deploy.tags = ['NeuronPoolCurveALETHPricer']
deploy.dependencies = ['Oracle', 'CRV3Pricer', 'NeuronPoolCurveALETH', 'ChainLinkPricerETH']
export default deploy
