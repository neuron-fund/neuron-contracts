import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { NeuronPoolCurveRenPricer__factory, Oracle__factory } from '../typechain-types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy, get } = deployments
  const [deployer] = await ethers.getSigners()

  const OracleDeployment = await get('Oracle')
  const NeuronPoolCurveRenDeployment = await get('NeuronPoolCurveRen')

  const PricerDeployment = await deploy<DeployArgs<NeuronPoolCurveRenPricer__factory>>('NeuronPoolCurveRenPricer', {
    from: deployer.address,
    args: [NeuronPoolCurveRenDeployment.address, 18, OracleDeployment.address],
  })

  const oracle = Oracle__factory.connect(OracleDeployment.address, deployer)
  const oracleOwnerAddress = await oracle.owner()
  const oracleOwner = await ethers.getSigner(oracleOwnerAddress)
  await oracle.connect(oracleOwner).setAssetPricer(NeuronPoolCurveRenDeployment.address, PricerDeployment.address)
}

deploy.tags = ['NeuronPoolCurveRenPricer']
deploy.dependencies = ['Oracle', 'NeuronPoolCurveRen', 'ChainLinkPricerWBTC']
export default deploy
