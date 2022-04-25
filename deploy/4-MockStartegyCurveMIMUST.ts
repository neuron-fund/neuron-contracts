import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { MockStrategy__factory } from '../typechain-types';

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy } = deployments
  const [deployer, dev, treasury] = await ethers.getSigners();

  await deploy<DeployArgs<MockStrategy__factory>>('MockStrategyCurveMIMUST', {
    contract: 'MockStrategy',
    from: deployer.address,
    args: [
      '0x55A8a39bc9694714E2874c1ce77aa1E599461E18',
      await deployer.getAddress(),
      await deployer.getAddress(),
      await deployer.getAddress(),
      await dev.getAddress(),
      await treasury.getAddress(),
    ]
  });
};

deploy.tags = ['MockStrategyCurveMIMUST'];
export default deploy;