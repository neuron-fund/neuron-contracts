import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { ChainLinkPricer__factory, Oracle__factory } from '../typechain-types'
import { CHAINLINK_USDCUSD, FRAX } from '../constants/addresses'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy, get } = deployments
  const [deployer] = await ethers.getSigners()

  const OracleDeployment = await get('Oracle')

  const PricerDeployment = await deploy<DeployArgs<ChainLinkPricer__factory>>('ChainLinkPricerFrax', {
    contract: 'ChainLinkPricer',
    from: deployer.address,
    args: [FRAX, CHAINLINK_USDCUSD, OracleDeployment.address],
  })

  const oracle = Oracle__factory.connect(OracleDeployment.address, deployer)
  const oracleOwnerAddress = await oracle.owner()
  const oracleOwner = await ethers.getSigner(oracleOwnerAddress)
  // await oracle.connect(oracleOwner).setAssetPricer(FRAX, PricerDeployment.address)
  await oracle.connect(oracleOwner).setStablePrice(FRAX, '100000000')
}

deploy.tags = ['ChainLinkPricerFrax']
deploy.dependencies = ['Oracle']
export default deploy
