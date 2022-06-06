import { BigNumber } from 'ethers'
import { ethers } from 'hardhat'
import { CRV3, DAI, FRAX, FRAX3CRV, LUSD, MIM, MIM3CRV, USDC, USDT } from '../../constants/addresses'

const SLOT_BY_TOKEN: { [key: string]: (recipient: string) => [number, string] | [string, number] } = {
  [LUSD]: recipient => [recipient, 2],
  [CRV3]: recipient => [3, recipient],
  [FRAX3CRV]: recipient => [15, recipient],
  [MIM3CRV]: recipient => [15, recipient],
  [DAI]: recipient => [recipient, 2],
  [USDC]: recipient => [recipient, 9],
  [USDT]: recipient => [recipient, 2],
  [FRAX]: recipient => [recipient, 0],
  [MIM]: recipient => [recipient, 0],
}

export default class ERC20Minter {
  public static async mint(tokenAddress: string, amount: BigNumber, recipient: string) {
    if (!SLOT_BY_TOKEN[tokenAddress]) throw Error('Not implemented token')
    const index = ethers.utils.solidityKeccak256(['uint256', 'uint256'], SLOT_BY_TOKEN[tokenAddress](recipient)).replace(/0x0*/, '0x')
    await this.setStorageAt(tokenAddress, index, this.toBytes32(amount).toString())
  }

  private static async setStorageAt(address: string, index: string, value: string) {
    await ethers.provider.send('hardhat_setStorageAt', [address, index, value])
    await ethers.provider.send('evm_mine', [])
  }

  private static toBytes32(bn) {
    return ethers.utils.hexlify(ethers.utils.zeroPad(bn.toHexString(), 32))
  }
}
