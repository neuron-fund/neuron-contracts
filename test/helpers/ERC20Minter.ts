import { BigNumber } from 'ethers'
import { ethers } from 'hardhat'
import {
  CRV3,
  DAI,
  FRAX,
  FRAX3CRV,
  HBTC,
  HCRV,
  LUSD,
  MIM,
  MIM3CRV,
  RENBTC,
  REN_CRV,
  UNISWAP_ROUTER_V2,
  USDC,
  USDT,
  WBTC,
  WETH,
} from '../../constants/addresses'
import { IERC20__factory, IUniswapRouterV2 } from '../../typechain-types'

const SLOT_BY_TOKEN: { [key: string]: ((recipient: string) => [number, string] | [string, number]) | true } = {
  [LUSD]: recipient => [recipient, 2],
  [CRV3]: recipient => [3, recipient],
  [FRAX3CRV]: recipient => [15, recipient],
  [MIM3CRV]: recipient => [15, recipient],
  [DAI]: recipient => [recipient, 2],
  [USDC]: recipient => [recipient, 9],
  [USDT]: recipient => [recipient, 2],
  [FRAX]: recipient => [recipient, 0],
  [MIM]: recipient => [recipient, 0],
  [HCRV]: recipient => [3, recipient],
  [HBTC]: true, // balanceOf - field in struct, cant find storage slot
  [WBTC]: recipient => [recipient, 0],
  [REN_CRV]: recipient => [3, recipient],
  [RENBTC]: recipient => [recipient, 0],
}

export default class ERC20Minter {
  public static async mint(tokenAddress: string, amount: BigNumber, recipient: string) {
    if (!SLOT_BY_TOKEN[tokenAddress]) throw Error('Not implemented token')

    if (SLOT_BY_TOKEN[tokenAddress] === true) {
      // if token not have standart balanceOf field slot, use uniswap
      await this.swapETHForExactTokens(tokenAddress, amount, recipient)
    } else {
      const index = ethers.utils
        .solidityKeccak256(['uint256', 'uint256'], (SLOT_BY_TOKEN[tokenAddress] as any)(recipient))
        .replace(/0x0*/, '0x')
      await this.setStorageAt(tokenAddress, index, this.toBytes32(amount).toString())
    }
  }

  private static async swapETHForExactTokens(tokenAddress: string, amount: BigNumber, recipient: string) {
    const uniswapRouter = (await ethers.getContractAt('IUniswapRouterV2', UNISWAP_ROUTER_V2)) as IUniswapRouterV2

    const token = IERC20__factory.connect(tokenAddress, ethers.provider)

    const initialBalance = await token.balanceOf(recipient)

    await uniswapRouter.swapETHForExactTokens(amount, [WETH, tokenAddress], recipient, Date.now() + 30000, {
      gasLimit: 4000000,
      value: (await ethers.provider.getBalance(recipient)).mul(8).div(10), // 80%
    })

    const resultBalance = await token.balanceOf(recipient)

    if (resultBalance.lte(initialBalance)) throw 'Not have liqudity'
  }

  private static async setStorageAt(address: string, index: string, value: string) {
    await ethers.provider.send('hardhat_setStorageAt', [address, index, value])
    await ethers.provider.send('evm_mine', [])
  }

  private static toBytes32(bn) {
    return ethers.utils.hexlify(ethers.utils.zeroPad(bn.toHexString(), 32))
  }
}
