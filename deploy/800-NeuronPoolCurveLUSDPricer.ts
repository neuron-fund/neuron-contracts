import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { NeuronPoolCurveLUSDPricer__factory } from '../typechain-types/factories/contracts/pricers/NeuronPoolCurveLUSDPricer__factory'
import { Oracle__factory } from '../typechain-types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy, get } = deployments
  const [deployer] = await ethers.getSigners()

  const NeuronPoolStabilityPoolLUSDDeployment = await get('NeuronPoolStabilityPoolLUSD')
  const CRV3PricerDeployment = await get('CRV3Pricer')
  const OracleDeployment = await get('Oracle')

  const PricerDeployment = await deploy<DeployArgs<NeuronPoolCurveLUSDPricer__factory>>('NeuronPoolCurveLUSDPricer', {
    from: deployer.address,
    args: [NeuronPoolStabilityPoolLUSDDeployment.address, CRV3PricerDeployment.address, 18, OracleDeployment.address],
  })

  const oracle = Oracle__factory.connect(OracleDeployment.address, deployer)
  const oracleOwnerAddress = await oracle.owner()
  const oracleOwner = await ethers.getSigner(oracleOwnerAddress)
  await oracle
    .connect(oracleOwner)
    .setAssetPricer(NeuronPoolStabilityPoolLUSDDeployment.address, PricerDeployment.address)
}

deploy.tags = ['NeuronPoolCurveLUSDPricer']
deploy.dependencies = ['CRV3Pricer', 'Oracle', 'NeuronPoolStabilityPoolLUSD']
export default deploy
