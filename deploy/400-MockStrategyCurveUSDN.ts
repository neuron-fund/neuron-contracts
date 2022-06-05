import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { MockStrategy__factory } from '../typechain-types';

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy } = deployments
  const [deployer, dev, treasury] = await ethers.getSigners();

  await deploy<DeployArgs<MockStrategy__factory>>('MockStrategyCurveUSDN', {
    contract: 'MockStrategy',
    from: deployer.address,
    args: [
      '0x4f3E8F405CF5aFC05D68142F3783bDfE13811522',
      await deployer.getAddress(),
      await deployer.getAddress(),
      await deployer.getAddress(),
      await dev.getAddress(),
      await treasury.getAddress(),
    ]
  });
};

deploy.tags = ['MockStrategyCurveUSDN'];
export default deploy;