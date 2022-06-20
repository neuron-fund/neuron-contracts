import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { ChainLinkPricerRen__factory, Oracle__factory } from '../typechain-types'
import { RENBTC } from '../constants/addresses'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy, get } = deployments
  const [deployer] = await ethers.getSigners()

  const OracleDeployment = await get('Oracle')

  const PricerDeployment = await deploy<DeployArgs<ChainLinkPricerRen__factory>>('ChainLinkPricerRen', {
    contract: 'ChainLinkPricerRen',
    from: deployer.address,
    args: [await deployer.getAddress(), OracleDeployment.address],
  })

  const oracle = Oracle__factory.connect(OracleDeployment.address, deployer)
  await oracle.setAssetPricer(RENBTC, PricerDeployment.address)
}

deploy.tags = ['ChainLinkPricerRen']
deploy.dependencies = ['Oracle']
export default deploy
