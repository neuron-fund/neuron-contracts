import { BigNumber } from 'ethers';
import { ethers } from 'hardhat';

export default class ERC20Minter {
    public static async mint(slot: [number | string, string | number], tokenAddress: string, amount: BigNumber) {
        const index = ethers.utils.solidityKeccak256(
            ["uint256", "uint256"],
            slot,
        );
        await this.setStorageAt(tokenAddress, index, this.toBytes32(amount).toString());
    }

    private static async setStorageAt(address: string, index: string, value: string) {
        await ethers.provider.send("hardhat_setStorageAt", [address, index, value]);
        await ethers.provider.send("evm_mine", []);
    }

    private static toBytes32(bn) {
        return ethers.utils.hexlify(ethers.utils.zeroPad(bn.toHexString(), 32));
    }
}