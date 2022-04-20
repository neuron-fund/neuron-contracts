import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { MockStrategy__factory } from '../typechain'
import { DeployArgs } from '../types'

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy } = deployments
  const [deployer, dev, treasury] = await ethers.getSigners();


  await deploy<DeployArgs<MockStrategy__factory>>('MockStrategyCurve3pool', {
    contract: 'MockStrategy',
    from: deployer.address,
    args: [
      '0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490',
      await deployer.getAddress(),
      await deployer.getAddress(),
      await deployer.getAddress(),
      await dev.getAddress(),
      await treasury.getAddress(),
    ]
  });
}

deploy.tags = ['MockStrategyCurve3pool']
export default deploy