import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { CRV3Pricer__factory, Oracle__factory } from '../typechain-types'
import { CRV3 } from '../constants/addresses'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy, get } = deployments
  const [deployer] = await ethers.getSigners()

  const OracleDeployment = await get('Oracle')

  const PricerDeployment = await deploy<DeployArgs<CRV3Pricer__factory>>('CRV3Pricer', {
    contract: 'CRV3Pricer',
    from: deployer.address,
    args: [OracleDeployment.address],
  })

  const oracle = Oracle__factory.connect(OracleDeployment.address, deployer)
  await oracle.setAssetPricer(CRV3, PricerDeployment.address)
}

deploy.tags = ['CRV3Pricer']
deploy.dependencies = ['Oracle', 'ChainLinkPricerDAI', 'ChainLinkPricerUSDC', 'ChainLinkPricerUSDT']
export default deploy
