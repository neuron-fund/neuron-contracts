import { BigNumber } from '@ethersproject/bignumber'
import { parseEther } from '@ethersproject/units'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { deployments, ethers } from 'hardhat'
import { UNISWAP_FACTORY_V2, UNISWAP_ROUTER_V2, USDC, WETH, WBTC } from '../constants/addresses'
import {
  ERC20,
  ERC20__factory,
  IUniswapRouterV2__factory,
  NeuronToken,
  NeuronToken__factory,
  UniswapV2_ZapIn_General_V5,
} from '../typechain-types'
import { UniswapV2_ZapIn_General_V5__factory, IUniswapV2Factory, IWETH } from '../typechain-types'
import { IUniswapV2Factory__factory, IWETH__factory } from '../typechain-types/factories/contracts/interfaces'
import TokenHelper from './helpers/TokenHelper'

const { AddressZero } = ethers.constants


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
  let signer: SignerWithAddress
  let token: NeuronToken
  let zapper: UniswapV2_ZapIn_General_V5
  let pair: string
  let initSnapshot: string

  before(async () => {
    await deployments.fixture(['NeuronToken', 'UniswapV2_ZapIn_General_V5'])

    signer = (await ethers.getSigners())[0]

    const NeuronTokenDeployment = await deployments.get('NeuronToken')
    const UniswapV2_ZapIn_General_V5Deployment = await deployments.get('UniswapV2_ZapIn_General_V5')

    token = NeuronToken__factory.connect(NeuronTokenDeployment.address, signer)
    zapper = UniswapV2_ZapIn_General_V5__factory.connect(UniswapV2_ZapIn_General_V5Deployment.address, signer)

    const uniRouter = IUniswapRouterV2__factory.connect(UNISWAP_ROUTER_V2, signer)
    const uniFactory = IUniswapV2Factory__factory.connect(UNISWAP_FACTORY_V2, signer)
    const weth = IWETH__factory.connect(WETH, signer) as IWETH & ERC20

    const initDexTokenAmount = parseEther('100')
    const initDexEthAmount = parseEther('200')

    await uniFactory.createPair(token.address, weth.address)
    pair = await uniFactory.getPair(token.address, weth.address)

    await token.approve(uniRouter.address, initDexTokenAmount)

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

    initSnapshot = await ethers.provider.send('evm_snapshot', [])
  })

  afterEach(async () => {
    await ethers.provider.send('evm_revert', [initSnapshot])
    initSnapshot = await ethers.provider.send('evm_snapshot', [])
  })

  it('token test', async () => {
    const zapInTokenAddress = WBTC
    const zapInTokenContract = ERC20__factory.connect(zapInTokenAddress, signer)
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

    const lpPair = ERC20__factory.connect(pair, signer)

    const lpBalance = await lpPair.balanceOf(signer.address)
    const tokenBalance = await token.balanceOf(signer.address)
    console.log(`it ~ lpBalance`, lpBalance.toString())
    console.log(`it ~ lpBalance`, tokenBalance.toString())
  })
})
