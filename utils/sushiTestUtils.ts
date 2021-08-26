import { BigNumber, BigNumberish, Signer, constants as ethersConstants } from 'ethers'
import { SUSHISWAP_ROUTER, WETH } from '../constants/addresses'
import { IERC20__factory, IUniswapRouterV2__factory, IUniswapV2Pair__factory, IWETH__factory } from '../typechain'


export async function sushiGetLpToken (
  { signer, ethAmount, lpTokenAddress }: { signer: Signer, lpTokenAddress: string, ethAmount: BigNumber }
) {
  const lpTokenContract = await IUniswapV2Pair__factory.connect(lpTokenAddress, signer)
  const wethContract = await IWETH__factory.connect(WETH, signer)
  const sushiRouter =await  IUniswapRouterV2__factory.connect(SUSHISWAP_ROUTER, signer)


  const token0 = await lpTokenContract.token0()
  const token1 = await lpTokenContract.token1()

  if (token0 !== WETH) {
    await sushiGetERC20WithEth({ signer, tokenAddress: token0, ethAmount: ethAmount.div(2) })
  } else {
    await wethContract.deposit({ value: ethAmount.div(2) })
  }

  if (token1 !== WETH) {
    await sushiGetERC20WithEth({ signer, tokenAddress: token1, ethAmount: ethAmount.div(2) })
  } else {
    await wethContract.deposit({ value: ethAmount.div(2) })
  }

  const token0Contract = await IERC20__factory.connect(token0, signer)
  const token1Contract = await IERC20__factory.connect(token1, signer)

  await token0Contract.approve(SUSHISWAP_ROUTER, ethersConstants.MaxUint256)
  await token1Contract.approve(SUSHISWAP_ROUTER, ethersConstants.MaxUint256)

  const deadline = Math.floor(Date.now() / 1000) + 20000000

  await sushiRouter.addLiquidity(
    token0,
    token1,
    await token0Contract.balanceOf(await signer.getAddress()),
    await token1Contract.balanceOf(await signer.getAddress()),
    0,
    0,
    await signer.getAddress(),
    deadline,
  )
}


export async function sushiGetERC20WithEth (
  { signer, tokenAddress, ethAmount }: { signer: Signer, tokenAddress: string, ethAmount: BigNumber }
) {
  const sushiRouter = await IUniswapRouterV2__factory.connect(SUSHISWAP_ROUTER, signer)
  const path = [WETH, tokenAddress]
  const deadline = Math.floor(Date.now() / 1000) + 20000000
  await sushiRouter.swapExactETHForTokens(0, path, await signer.getAddress(), deadline, { value: ethAmount })
}
