import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { MockStrategy__factory } from '../typechain-types';

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy } = deployments
  const [deployer, dev, treasury] = await ethers.getSigners();

  await deploy<DeployArgs<MockStrategy__factory>>('MockStrategyCurveMIM', {
    contract: 'MockStrategy',
    from: deployer.address,
    args: [
      '0x5a6A4D54456819380173272A5E8E9B9904BdF41B',
      await deployer.getAddress(),
      await deployer.getAddress(),
      await deployer.getAddress(),
      await dev.getAddress(),
      await treasury.getAddress(),
    ]
  });
};

deploy.tags = ['MockStrategyCurveMIM'];
export default deploy;