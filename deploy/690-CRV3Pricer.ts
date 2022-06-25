import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { CRV3Pricer__factory, IERC20Metadata__factory, Oracle__factory } from '../typechain-types'
import { CRV3, CURVE_3CRV_LP_TOKEN } from '../constants/addresses'

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
  const oracleOwnerAddress = await oracle.owner()
  const oracleOwner = await ethers.getSigner(oracleOwnerAddress)
  await oracle.connect(oracleOwner).setStablePrice(CRV3, '100000000')
}

deploy.tags = ['CRV3Pricer']
deploy.dependencies = ['Oracle', 'ChainLinkPricerDAI', 'ChainLinkPricerUSDC', 'ChainLinkPricerUSDT']
export default deploy
