import "@nomiclabs/hardhat-ethers";
import { ethers, network } from "hardhat";
import { NeuronTokenAddress } from "../frontend/mainnetAddresses";
import { NeuronToken__factory } from "../typechain";

const { parseEther } = ethers.utils;

async function main() {
  const neurAddress = NeuronTokenAddress;
  const [wallet, wallet1, wallet2] = await ethers.getSigners();
  let neurToken = await NeuronToken__factory.connect(neurAddress, wallet);
  const minterAddress = await neurToken.minters(0);

  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [minterAddress],
  });

  const minter = await ethers.getSigner(minterAddress);

  await neurToken.connect(minter).mint(wallet.address, parseEther("100"));
  await neurToken.connect(minter).mint(wallet1.address, parseEther("100"));
  await neurToken.connect(minter).mint(wallet2.address, parseEther("100"));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
