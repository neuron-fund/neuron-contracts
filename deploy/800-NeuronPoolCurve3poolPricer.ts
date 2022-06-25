import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { NeuronPoolCurve3poolPricer__factory, Oracle__factory } from '../typechain-types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy, get } = deployments
  const [deployer] = await ethers.getSigners()

  const OracleDeployment = await get('Oracle')
  const NeuronPoolCurve3poolDeployment = await get('NeuronPoolCurve3pool')
  const CRV3PricerDeployment = await get('CRV3Pricer')

  const PricerDeployment = await deploy<DeployArgs<NeuronPoolCurve3poolPricer__factory>>('NeuronPoolCurve3poolPricer', {
    from: deployer.address,
    args: [NeuronPoolCurve3poolDeployment.address, CRV3PricerDeployment.address, 18, OracleDeployment.address],
  })

  const oracle = Oracle__factory.connect(OracleDeployment.address, deployer)
  const oracleOwnerAddress = await oracle.owner()
  const oracleOwner = await ethers.getSigner(oracleOwnerAddress)
  await oracle.connect(oracleOwner).setAssetPricer(NeuronPoolCurve3poolDeployment.address, PricerDeployment.address)
}

deploy.tags = ['NeuronPoolCurve3poolPricer']
deploy.dependencies = ['Oracle', 'CRV3Pricer', 'NeuronPoolCurve3pool']
export default deploy
