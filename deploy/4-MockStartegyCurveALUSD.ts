import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { DeployArgs } from '../types'
import { MockStrategy__factory } from '../typechain-types';

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, deployments } = hre
  const { deploy } = deployments
  const [deployer, dev, treasury] = await ethers.getSigners();


  await deploy<DeployArgs<MockStrategy__factory>>('MockStrategyCurveALUSD', {
    contract: 'MockStrategy',
    from: deployer.address,
    args: [
      '0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c',
      await deployer.getAddress(),
      await deployer.getAddress(),
      await deployer.getAddress(),
      await dev.getAddress(),
      await treasury.getAddress(),
    ]
  });
};

deploy.tags = ['MockStrategyCurveALUSD'];
export default deploy;