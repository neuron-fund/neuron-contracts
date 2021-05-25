
import "@nomiclabs/hardhat-ethers"
import { Signer } from 'ethers'
import { ethers } from "hardhat"
import { DAI, UniswapRouterV2Address, WETH, CURVE_3CRV_POOL, THREE_CRV, WBTC, CURVE_REN_CRV_POOL, REN_CRV, CURVE_STE_CRV_POOL, LIDO_ST_ETH, STE_CRV } from '../constants/addresses'
import { IUniswapRouterV2, ICurveFi3, IERC20, ICurveFi2, IStEth, ICurveFi, ERC20 } from '../typechain'

export const getToken = async (address: string, signer: Signer) => {
  return (await ethers.getContractAt('ERC20', address, signer)) as ERC20
}

export const get3Crv = async (recipient: Signer) => {
  const accAddress = await recipient.getAddress()
  const dai = await getToken(DAI, recipient)
  const ethBalanceBefore = ethers.utils.formatEther(await recipient.getBalance())
  const daiBalanceBefore = ethers.utils.formatEther(await dai.balanceOf(accAddress))

  const uniswapRouter = await ethers.getContractAt('IUniswapRouterV2', UniswapRouterV2Address, recipient) as IUniswapRouterV2

  await uniswapRouter.swapExactETHForTokens(
    '0',
    [WETH, DAI],
    await recipient.getAddress(),
    Date.now() + 30000,
    {
      gasLimit: 4000000,
      value: ethers.utils.parseEther("5"),
    },
  )

  const ethBalanceAfter = ethers.utils.formatEther((await recipient.getBalance()))
  const daiBalanceAfter = await dai.balanceOf(accAddress)
  const curve3CrvPool = await ethers.getContractAt('ICurveFi_3', CURVE_3CRV_POOL, recipient) as ICurveFi3
  await dai.connect(recipient).approve(curve3CrvPool.address, daiBalanceAfter)
  await curve3CrvPool.add_liquidity([daiBalanceAfter, 0, 0], 0)
  const threeCrv = await getToken(THREE_CRV, recipient)
  const threeCrvBalance = await threeCrv.balanceOf(accAddress)
}

export const getRenCrv = async (recipient: Signer) => {
  const accAddress = await recipient.getAddress()
  const wbtc = await getToken(WBTC, recipient)
  const ethBalanceBefore = ethers.utils.formatEther(await recipient.getBalance())
  const wbtcBalanceBefore = ethers.utils.formatEther(await wbtc.balanceOf(accAddress))

  const uniswapRouter = await ethers.getContractAt('IUniswapRouterV2', UniswapRouterV2Address, recipient) as IUniswapRouterV2

  await uniswapRouter.swapExactETHForTokens(
    '0',
    [WETH, WBTC],
    await recipient.getAddress(),
    Date.now() + 30000,
    {
      gasLimit: 4000000,
      value: ethers.utils.parseEther("100"),
    },
  )

  const ethBalanceAfter = ethers.utils.formatEther((await recipient.getBalance()))
  const wbtcBalanceAfter = await wbtc.balanceOf(accAddress)
  const curveRenCrvPool = await ethers.getContractAt('ICurveFi_2', CURVE_REN_CRV_POOL, recipient) as ICurveFi2
  await wbtc.connect(recipient).approve(curveRenCrvPool.address, wbtcBalanceAfter)
  await curveRenCrvPool.add_liquidity([0, wbtcBalanceAfter], 0)
  const renCrv = await getToken(REN_CRV, recipient)
  const renCrvBalance = await renCrv.balanceOf(accAddress)
}


export const getSteCrv = async (recipient: Signer) => {
  const accAddress = await recipient.getAddress()

  const lidoStEth = await ethers.getContractAt('IStEth', LIDO_ST_ETH, recipient) as IStEth
  const ethBalanceBefore = ethers.utils.formatEther(await recipient.getBalance())
  await lidoStEth.submit(accAddress, { value: ethers.utils.parseEther('100') })

  const ethBalanceAfter = ethers.utils.formatEther(await recipient.getBalance())
  const stEthBalanceAfter = await lidoStEth.balanceOf(accAddress)

  const curveSteCrvPool = await ethers.getContractAt('ICurveFi', CURVE_STE_CRV_POOL, recipient) as ICurveFi
  await lidoStEth.connect(recipient).approve(curveSteCrvPool.address, stEthBalanceAfter)
  // await curveSteCrvPool.add_liquidity([stEthBalanceAfter, stEthBalanceAfter], 0)
  const amount = ethers.utils.parseEther('1')
  await curveSteCrvPool.add_liquidity([amount, amount], 0, { value: amount })
  const steCrv = await getToken(STE_CRV, recipient)
  const steCrvBalance = await steCrv.balanceOf(accAddress)
}