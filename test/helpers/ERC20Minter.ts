import { BigNumber } from 'ethers';
import { ethers } from 'hardhat';
import { CRV3, FRAX3CRV, LUSD, MIM3CRV } from '../../constants/addresses';

const SLOT_BY_TOKEN: {[key: string]: (recipient: string) => [number| string, string | number]} = {
    [LUSD]: recipient => [recipient, 2],
    [CRV3]: recipient => [3, recipient],
    [FRAX3CRV]: recipient => [15, recipient],
    [MIM3CRV]: recipient => [15, recipient],
}

export default class ERC20Minter {
    public static async mint(tokenAddress: string, amount: BigNumber, recipient: string) {
        const index = ethers.utils.solidityKeccak256(
            ["uint256", "uint256"],
            SLOT_BY_TOKEN[tokenAddress](recipient),
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