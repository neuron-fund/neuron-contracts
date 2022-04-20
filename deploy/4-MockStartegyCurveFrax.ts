import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { MockStrategy__factory } from '../typechain'
import { DeployArgs } from '../types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy } = deployments
  const [deployer, dev, treasury] = await ethers.getSigners();


  await deploy<DeployArgs<MockStrategy__factory>>('MockStrategyCurveFrax', {
    contract: 'MockStrategy',
    from: deployer.address,
    args: [
      '0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B',
      await deployer.getAddress(),
      await deployer.getAddress(),
      await deployer.getAddress(),
      await dev.getAddress(),
      await treasury.getAddress(),
    ]
  });
}

deploy.tags = ['MockStrategyCurveFrax']
export default deploy