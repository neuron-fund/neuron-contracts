import { assert } from 'chai'
import { Signer } from 'ethers'
import { ethers, network } from 'hardhat'
import {
  ALUSD,
  ALUSD3CRV,
  CRV3,
  DAI,
  FRAX,
  FRAX3CRV,
  LUSD,
  LUSD3CRV,
  MIM,
  MIM3CRV,
  MIMUST,
  UNISWAP_ROUTER_V2,
  USDC,
  USDP,
  USDP3CRV,
  USDT,
  UST,
  WETH,
  WBTC,
} from '../../constants/addresses'
import { IERC20, IERC20__factory, IUniswapRouterV2 } from '../../typechain-types'

export default class TokenHelper {
  public static async getToken(address: string, signer?: Signer): Promise<IERC20> {
    return (await ethers.getContractAt(
      '@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20',
      address,
      signer
    )) as IERC20
  }

  public static async createTokens(token: string, recipient: Signer) {
    const canUniswapTokens = {
      [DAI]: true,
      [USDC]: true,
      [USDT]: true,
      [CRV3]: true,
      [FRAX]: true,
      [LUSD]: true,
      [USDP]: true,
      [MIM]: true,
      [UST]: true,
      [WBTC]: true,
    }
    const erc20token = await this.getToken(token)
    const initialBalance = await erc20token.balanceOf(await recipient.getAddress())
    if (canUniswapTokens[token]) {
      const uniswapRouter = (await ethers.getContractAt('IUniswapRouterV2', UNISWAP_ROUTER_V2)) as IUniswapRouterV2

      await uniswapRouter.swapExactETHForTokens('0', [WETH, token], await recipient.getAddress(), Date.now() + 30000, {
        gasLimit: 4000000,
        value: ethers.utils.parseEther('500'),
      })
    } else {
      // INITIAL BLOCK NUMBER = 14560420
      const holders = {
        [FRAX3CRV]: '0xdca313c4df33c2142b2adf202d6abf4fa56e1d41',
        [LUSD3CRV]: '0xc64844d9b3db280a6e46c1431e2229cd62dd2d69',
        [ALUSD3CRV]: '0x613d9871c25721e8f90acf8cc4341bb145f29c23',
        [ALUSD]: '0x50acc1281845be0ac6936b4d7ad6a14ae613c1c9',
        [USDP3CRV]: '0x44bc6e3a8384979df6673ac81066c67c83d6d6b2',
        [MIMUST]: '0xcd468d6421a6c5109d6c29698548b2af46a5e21b',
        [MIM3CRV]: '0xe896e539e557bc751860a7763c8dd589af1698ce',
      }

      const holderAddress = holders[token]

      if (holderAddress) {
        await network.provider.request({
          method: 'hardhat_impersonateAccount',
          params: [holderAddress],
        })
        const holder = await ethers.getSigner(holderAddress)
        await recipient.sendTransaction({
          to: holderAddress,
          value: ethers.utils.parseEther('1'),
        })
        const holdedToken = IERC20__factory.connect(token, holder)
        // assert(false, `${await holdedToken.balanceOf(holderAddress)}`)
        await holdedToken.transfer(await recipient.getAddress(), await holdedToken.balanceOf(holderAddress))
      }
    }
    const balance = (await erc20token.balanceOf(await recipient.getAddress())).sub(initialBalance)
    assert(balance.gt(0), `Fail createTokens ${token}`)
  }
}
