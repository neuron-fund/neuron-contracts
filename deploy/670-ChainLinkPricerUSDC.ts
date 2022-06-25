import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { ChainLinkPricer__factory, Oracle__factory } from '../typechain-types'
import { CHAINLINK_USDTUSD, USDC } from '../constants/addresses'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy, get } = deployments
  const [deployer] = await ethers.getSigners()

  const OracleDeployment = await get('Oracle')

  const PricerDeployment = await deploy<DeployArgs<ChainLinkPricer__factory>>('ChainLinkPricerUSDC', {
    contract: 'ChainLinkPricer',
    from: deployer.address,
    args: [USDC, CHAINLINK_USDTUSD, OracleDeployment.address],
  })

  const oracle = Oracle__factory.connect(OracleDeployment.address, deployer)
  const oracleOwnerAddress = await oracle.owner()
  const oracleOwner = await ethers.getSigner(oracleOwnerAddress)
  // await oracle.connect(oracleOwner).setAssetPricer(USDC, PricerDeployment.address)
}

deploy.tags = ['ChainLinkPricerUSDC']
deploy.dependencies = ['Oracle']
export default deploy
