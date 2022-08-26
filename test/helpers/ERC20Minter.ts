import { BigNumber } from 'ethers'
import { ethers, network } from 'hardhat'
import {
  ALETH,
  ALETH_ETH,
  CRV3,
  CURVE_REN_WBTC_SBTC,
  DAI,
  ETH,
  FRAX,
  FRAX3CRV,
  HBTC,
  HCRV,
  LUSD,
  MIM,
  MIM3CRV,
  RENBTC,
  REN_CRV,
  SBTC,
  STETH,
  STE_CRV,
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
  [WBTC]: true, //recipient => [recipient, 0],
  [REN_CRV]: recipient => [3, recipient],
  [RENBTC]: true, //recipient => [recipient, 0],
  [ALETH_ETH]: recipient => [24, recipient],
  [STE_CRV]: recipient => [2, recipient],
  [WETH]: recipient => [recipient, 3],
  [ALETH]: recipient => [recipient, 1],
  [STETH]: true,
  [ALETH]: recipient => [recipient, 1],
  [CURVE_REN_WBTC_SBTC]: recipient => [3, recipient],
  [SBTC]: true,
}

export default class ERC20Minter {
  public static async mint(tokenAddress: string, amount: BigNumber, recipient: string) {
    if(tokenAddress == ETH) return;
    if (!SLOT_BY_TOKEN[tokenAddress]) throw Error(`Not implemented token ${tokenAddress}`)

    if (SLOT_BY_TOKEN[tokenAddress] === true) {
      // if token not have standart balanceOf field slot, use uniswap
      if(tokenAddress == SBTC) {
        const holder = '0x70be8010b63ce50cf29450aec2c9881838234651'
        await network.provider.request({
          method: 'hardhat_impersonateAccount',
          params: [holder],
        })
        const signer = await ethers.getSigner(holder);
        const sbtc = IERC20__factory.connect(SBTC, signer);
        await sbtc.transfer(recipient, await sbtc.balanceOf(holder))
      } else {
        await this.swapExactETHForTokens(tokenAddress, amount, recipient)
      }
    } else {
      const index = ethers.utils
        .solidityKeccak256(['uint256', 'uint256'], (SLOT_BY_TOKEN[tokenAddress] as any)(recipient))
        .replace(/0x0*/, '0x')
      await this.setStorageAt(tokenAddress, index, this.toBytes32(amount).toString())
    }
  }

  private static async swapExactETHForTokens(tokenAddress: string, amount: BigNumber, recipient: string) {
    const uniswapRouter = (await ethers.getContractAt('IUniswapRouterV2', UNISWAP_ROUTER_V2)) as IUniswapRouterV2

    const token = IERC20__factory.connect(tokenAddress, ethers.provider)

    const initialBalance = await token.balanceOf(recipient)

    await uniswapRouter.swapExactETHForTokens(0, [WETH, tokenAddress], recipient, Date.now() + 30000, {
      gasLimit: 4000000,
      value: amount, 
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
