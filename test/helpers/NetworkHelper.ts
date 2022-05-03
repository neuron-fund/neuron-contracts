import { ethers, network } from "hardhat";

export default class NetworkHelper {
    protected static initialBlockNumber: number;
    public static async reset() {
        if (this.initialBlockNumber === undefined) this.initialBlockNumber = await ethers.provider.getBlockNumber();
        else await network.provider.request({
            method: "hardhat_reset",
            params: [{
                forking: {
                    jsonRpcUrl: process.env.POLYGON ? process.env.ALCHEMY_POLYGON : process.env.ALCHEMY,
                    blockNumber: this.initialBlockNumber
                }
            }]
        });
    }

    public static async impersonateAccount(acctAddress: string) {
        await network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [acctAddress],
        });
        return await ethers.getSigner(acctAddress);
    }
}