
import "@nomiclabs/hardhat-ethers"
import { Signer } from 'ethers'
import { ethers } from "hardhat"
import { DAI, UniswapRouterV2Address, WETH, CURVE_3CRV_POOL, THREE_CRV, WBTC, CURVE_REN_CRV_POOL, REN_CRV, CURVE_STE_CRV_POOL, LIDO_ST_ETH, STE_CRV } from '../constants/addresses'
import { IUniswapRouterV2, ICurveFi3, IERC20, ICurveFi2, IStEth, ICurveFi } from '../typechain'

export const getToken = async (address: string, signer: Signer) => {
  return (await ethers.getContractAt('IERC20', address, signer)) as IERC20
}

export const get3Crv = async (recipient: Signer) => {
  const accAddress = await recipient.getAddress()
  const dai = await getToken(DAI, recipient)
  const ethBalanceBefore = ethers.utils.formatEther(await recipient.getBalance())
  const daiBalanceBefore = ethers.utils.formatEther(await dai.balanceOf(accAddress))
  console.log(`ethBalanceBefore`, ethBalanceBefore)
  console.log(`daiBalanceBefore`, daiBalanceBefore)

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
  console.log(`ethBalanceAfter`, ethBalanceAfter)
  console.log(`daiBalanceAfter`, ethers.utils.formatEther(daiBalanceAfter))
  const curve3CrvPool = await ethers.getContractAt('ICurveFi_3', CURVE_3CRV_POOL, recipient) as ICurveFi3
  await dai.connect(recipient).approve(curve3CrvPool.address, daiBalanceAfter)
  await curve3CrvPool.add_liquidity([daiBalanceAfter, 0, 0], 0)
  const threeCrv = await getToken(THREE_CRV, recipient)
  const threeCrvBalance = await threeCrv.balanceOf(accAddress)
  console.log(`threeCrvBalance`, ethers.utils.formatEther(threeCrvBalance))
}

export const getRenCrv = async (recipient: Signer) => {
  const accAddress = await recipient.getAddress()
  const wbtc = await getToken(WBTC, recipient)
  const ethBalanceBefore = ethers.utils.formatEther(await recipient.getBalance())
  const wbtcBalanceBefore = ethers.utils.formatEther(await wbtc.balanceOf(accAddress))
  console.log(`ethBalanceBefore`, ethBalanceBefore)
  console.log(`wbtcBalanceBefore`, wbtcBalanceBefore)

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
  console.log(`ethBalanceAfter`, ethBalanceAfter)
  console.log(`wbtcBalanceAfter`, ethers.utils.formatEther(wbtcBalanceAfter))
  const curveRenCrvPool = await ethers.getContractAt('ICurveFi_2', CURVE_REN_CRV_POOL, recipient) as ICurveFi2
  await wbtc.connect(recipient).approve(curveRenCrvPool.address, wbtcBalanceAfter)
  await curveRenCrvPool.add_liquidity([0, wbtcBalanceAfter], 0)
  const renCrv = await getToken(REN_CRV, recipient)
  const renCrvBalance = await renCrv.balanceOf(accAddress)
  console.log(`renCrvBalance`, ethers.utils.formatEther(renCrvBalance))
}


export const getSteCrv = async (recipient: Signer) => {
  const accAddress = await recipient.getAddress()

  const lidoStEth = await ethers.getContractAt('IStEth', LIDO_ST_ETH, recipient) as IStEth
  const ethBalanceBefore = ethers.utils.formatEther(await recipient.getBalance())
  console.log(`ethBalanceBefore`, ethBalanceBefore)
  console.log('stEth balance Before', ethers.utils.formatEther(await lidoStEth.balanceOf(accAddress)))
  console.log('Deposit ETH into lido stEth pool to get StEth token')
  await lidoStEth.submit(accAddress, { value: ethers.utils.parseEther('100') })

  const ethBalanceAfter = ethers.utils.formatEther(await recipient.getBalance())
  const stEthBalanceAfter = await lidoStEth.balanceOf(accAddress)
  console.log(`ethBalanceAfter`, ethBalanceAfter)
  console.log('stEth balance after', ethers.utils.formatEther(stEthBalanceAfter))

  console.log('Getting curve ste crv pool contract')
  const curveSteCrvPool = await ethers.getContractAt('ICurveFi', CURVE_STE_CRV_POOL, recipient) as ICurveFi
  console.log('Approve sending steCrv from user to curve pool')
  await lidoStEth.connect(recipient).approve(curveSteCrvPool.address, stEthBalanceAfter)
  console.log('Adding liquidity by sending ETH and StEth to curve pool')
  // await curveSteCrvPool.add_liquidity([stEthBalanceAfter, stEthBalanceAfter], 0)
  const amount = ethers.utils.parseEther('1')
  console.log('Is enough balance', stEthBalanceAfter.gt(amount))
  await curveSteCrvPool.add_liquidity([amount, amount], 0, { value: amount })
  console.log('Geting STE_CRV token contract')
  const steCrv = await getToken(STE_CRV, recipient)
  const steCrvBalance = await steCrv.balanceOf(accAddress)
  console.log(`steCrvBalance`, ethers.utils.formatEther(steCrvBalance))
}