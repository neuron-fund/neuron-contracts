import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { MockStrategy__factory } from '../typechain-types';

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy } = deployments
  const [deployer, dev, treasury] = await ethers.getSigners();

  await deploy<DeployArgs<MockStrategy__factory>>('MockStrategyCurveUSDP', {
    contract: 'MockStrategy',
    from: deployer.address,
    args: [
      '0x7Eb40E450b9655f4B3cC4259BCC731c63ff55ae6',
      await deployer.getAddress(),
      await deployer.getAddress(),
      await deployer.getAddress(),
      await dev.getAddress(),
      await treasury.getAddress(),
    ]
  });
};

deploy.tags = ['MockStrategyCurveUSDP'];
export default deploy;