import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { ChainLinkPricerWBTC__factory, Oracle__factory } from '../typechain-types'
import { WBTC } from '../constants/addresses'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy, get } = deployments
  const [deployer] = await ethers.getSigners()

  const OracleDeployment = await get('Oracle')

  const PricerDeployment = await deploy<DeployArgs<ChainLinkPricerWBTC__factory>>('ChainLinkPricerWBTC', {
    contract: 'ChainLinkPricerWBTC',
    from: deployer.address,
    args: [await deployer.getAddress(), OracleDeployment.address],
  })

  const oracle = Oracle__factory.connect(OracleDeployment.address, deployer)
  await oracle.setAssetPricer(WBTC, PricerDeployment.address)
}

deploy.tags = ['ChainLinkPricerWBTC']
deploy.dependencies = ['Oracle']
export default deploy
