import { BigNumber } from '@ethersproject/bignumber'
import { parseEther } from '@ethersproject/units'
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { ethers } from 'hardhat'
import { CRV3, FRAX, UNISWAP_FACTORY_V2, UNISWAP_ROUTER_V2, USDC, WETH, WBTC } from '../constants/addresses'
import {
  ERC20,
  IUniswapFactory,
  IUniswapRouterV2,
  NeuronToken,
  NeuronToken__factory,
  UniswapV2_ZapIn_General_V5,
} from '../typechain-types'
import { IUniswapV2Factory, IWETH } from '../typechain-types/contracts/QuickSwapRouter.sol'
import { UniswapV2_ZapIn_General_V5__factory } from '../typechain-types/factories/contracts/ZapperZapIn.sol'
import TokenHelper from './helpers/TokenHelper'

const { AddressZero } = ethers.constants

// TODO add liquidity ETH
// TODO cheks if token is ETH or WETH therefore - no swap
// TODO supported tokens

type ZeroXQuoteParams = {
  buyToken: string
  sellToken: string
  gasPrice?: string
  takerAddress?: string
} & (
  | {
      buyTokenPercentageFee: string
      feeRecipient: string
    }
  | {
      buyTokenPercentageFee?: never
      feeRecipient?: never
    }
) &
  (
    | {
        buyAmount: string
        sellAmount?: never
      }
    | {
        buyAmount?: never
        sellAmount: string
      }
  )

export type ZeroXQuoteResponse = {
  chainId: number
  price: string
  guaranteedPrice: string
  to: string
  data: string
  value: string
  gas: string
  estimatedGas: string
  gasPrice: string
  protocolFee: string
  minimumProtocolFee: string
  buyTokenAddress: string
  sellTokenAddress: string
  buyAmount: string
  sellAmount: string
  sources: any[]
  orders: any[]
  allowanceTarget: string
  sellTokenToEthRate: string
  buyTokenToEthRate: string
  minAmountOut?: BigNumber
}

type AxiosRequestConfigZeroXQuoteParams = Omit<AxiosRequestConfig, 'params'> & { params: ZeroXQuoteParams }

type ZeroXSQuoteRequestInstance = Omit<AxiosInstance, 'get'> & {
  get(url: string, config?: AxiosRequestConfigZeroXQuoteParams): Promise<AxiosResponse<ZeroXQuoteResponse>>
}

const zeroXSQuoteRequestInstance: ZeroXSQuoteRequestInstance = axios.create({
  baseURL: `https://api.0x.org/swap/v1/quote`,
  method: 'GET',
})

const zeroXSQuoteRequest = zeroXSQuoteRequestInstance.get

describe('Unizap', () => {
  it('', async () => {
    const signer = (await ethers.getSigners())[0]
    const zapperFactory = (await ethers.getContractFactory(
      'UniswapV2_ZapIn_General_V5'
    )) as UniswapV2_ZapIn_General_V5__factory

    const uniRouter = (await ethers.getContractAt(
      'contracts/interfaces/IUniswapRouterV2.sol:IUniswapRouterV2',
      UNISWAP_ROUTER_V2,
      signer
    )) as IUniswapRouterV2
    const uniFactory = (await ethers.getContractAt(
      'contracts/interfaces/IUniswapV2Factory.sol:IUniswapV2Factory',
      UNISWAP_FACTORY_V2,
      signer
    )) as IUniswapV2Factory

    const tokenFactory = (await ethers.getContractFactory('NeuronToken', signer)) as NeuronToken__factory
    const token = (await tokenFactory.deploy(signer.address)) as NeuronToken
    await token.setMinter(signer.address)
    await token.applyMinter()

    const initDexTokenAmount = parseEther('100')
    const initDexEthAmount = parseEther('200')

    const weth = (await ethers.getContractAt('contracts/interfaces/IWETH.sol:IWETH', WETH, signer)) as IWETH & ERC20

    await weth.deposit({ value: initDexEthAmount })
    await token.mint(signer.address, initDexTokenAmount)

    const a = await uniFactory.createPair(token.address, weth.address)
    const pair = await uniFactory.getPair(token.address, weth.address)

    await token.approve(uniRouter.address, initDexTokenAmount)
    // await weth.approve(uniRouter.address, initDexEthAmount)

    await uniRouter.addLiquidityETH(
      token.address,
      initDexTokenAmount,
      initDexTokenAmount,
      initDexEthAmount,
      signer.address,
      '0xf000000000000000000000000000000000000000000000000000000000000000',
      {
        value: initDexEthAmount,
      }
    )

    const zapper = (await zapperFactory.deploy()) as UniswapV2_ZapIn_General_V5

    const zapInTokenAddress = WBTC
    const zapInTokenContract = (await ethers.getContractAt(
      '@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20',
      zapInTokenAddress,
      signer
    )) as ERC20
    await TokenHelper.createTokens(zapInTokenAddress, signer)
    const zapInAmount = await zapInTokenContract.balanceOf(signer.address)

    const zeroXSwapResponse = (
      await zeroXSQuoteRequest('', {
        params: {
          sellToken: zapInTokenAddress,
          buyToken: WETH,
          sellAmount: zapInAmount.toString(),
        },
      })
    ).data

    const { to: swapTarget, data: swapData } = zeroXSwapResponse

    await zapInTokenContract.approve(zapper.address, zapInAmount)
    await zapper.ZapIn(zapInTokenAddress, pair, zapInAmount, 0, swapTarget, swapData, true)

    const lpPair = (await ethers.getContractAt(
      '@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20',
      pair,
      signer
    )) as ERC20

    const lpBalance = await lpPair.balanceOf(signer.address)
    const tokenBalance = await token.balanceOf(signer.address)
    console.log(`it ~ lpBalance`, lpBalance.toString())
    console.log(`it ~ lpBalance`, tokenBalance.toString())
  })
})
