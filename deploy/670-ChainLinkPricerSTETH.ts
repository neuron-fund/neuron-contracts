import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { ChainLinkPricer__factory, Oracle__factory } from '../typechain-types'
import { CHAINLINK_STETHUSD, STETH } from '../constants/addresses'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy, get } = deployments
  const [deployer] = await ethers.getSigners()

  const OracleDeployment = await get('Oracle')

  const PricerDeployment = await deploy<DeployArgs<ChainLinkPricer__factory>>('ChainLinkPricerSTETH', {
    contract: 'ChainLinkPricer',
    from: deployer.address,
    args: [STETH, CHAINLINK_STETHUSD, OracleDeployment.address],
  })

  const oracle = Oracle__factory.connect(OracleDeployment.address, deployer)
  await oracle.setAssetPricer(STETH, PricerDeployment.address)
}

deploy.tags = ['ChainLinkPricerSTETH']
deploy.dependencies = ['Oracle']
export default deploy
