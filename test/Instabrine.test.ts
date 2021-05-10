
import "@nomiclabs/hardhat-ethers"
import { ethers, network } from "hardhat"
import { BigNumber, Signer } from "ethers"
import { Controller__factory, ICurveFi, IERC20, Instabrine, Instabrine__factory, IStEth, IUniswapRouterV2, NeuronPool__factory, StrategyCurveSteCRV__factory } from '../typechain'
import { assert } from 'chai'
import { formatEther, parseEther } from '@ethersproject/units'

const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F'
const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'

const UNISWAP_ROUTER_V2_ADDRESS = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'

const getToken = async (address: string, signer: Signer) => {
  return (await ethers.getContractAt('IERC20', address, signer)) as IERC20
}

const getERC20 = async (recipient: Signer, tokenAddress: string, amount: BigNumber) => {
  const uniswapRouter = await ethers.getContractAt('IUniswapRouterV2', UNISWAP_ROUTER_V2_ADDRESS, recipient) as IUniswapRouterV2
  const path = [WETH, tokenAddress]

  const estimateAmount = await uniswapRouter.getAmountsIn(amount, path)
  const ethAmount = estimateAmount[0]

  await uniswapRouter.swapETHForExactTokens(
    amount,
    path,
    await recipient.getAddress(),
    Date.now() + 60,
    {
      value: ethAmount,
    },
  )
}

describe('Instabrine', function () {
  let accounts: Signer[]
  let instabrine: Instabrine

  beforeEach(async function () {
    accounts = await ethers.getSigners()
    const Instabrine = await ethers.getContractFactory('Instabrine') as Instabrine__factory
    instabrine = await Instabrine.deploy()
  })


  it('should do something right', async function () {
    const user = accounts[0]
    const userAddress = await user.getAddress()
    await getERC20(user, DAI, parseEther('100'))

    const dai = await getToken(DAI, user)
    const ethBalance = formatEther(await user.getBalance())
    const daiBalance = formatEther(await dai.balanceOf(await user.getAddress()))
    await dai.approve(instabrine.address, daiBalance)
  })
})