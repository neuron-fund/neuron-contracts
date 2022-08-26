import { BigNumber } from '@ethersproject/bignumber'
import { parseEther } from '@ethersproject/units'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { assert } from 'chai'
import { deployments, ethers } from 'hardhat'
import {
  UNISWAP_FACTORY_V2,
  UNISWAP_ROUTER_V2,
  USDC,
  WETH,
  WBTC,
  DAI,
  USDT,
  FRAX,
  HBTC,
  MIM,
  RENBTC,
  ALETH,
  STETH,
  LUSD,
  SBTC,
  ETH,
} from '../constants/addresses'
import {
  ERC20,
  ERC20__factory,
  IUniswapRouterV2__factory,
  IUniswapV2Factory__factory,
  IWETH,
  IWETH__factory,
  NeuronToken,
  NeuronToken__factory,
} from '../typechain-types'
import { NeuronLiquidityPoolZapIn } from '../typechain-types/contracts/zap/ZapperZapIn.sol'
import { NeuronLiquidityPoolZapIn__factory } from '../typechain-types/factories/contracts/zap/ZapperZapIn.sol'
import ERC20Minter from './helpers/ERC20Minter'

interface ICONFIG {
  token: string
}

const CONFIGS: ICONFIG[] = [
  {
    token: WBTC
  },
  {
    token: DAI,
  },
  {
    token: USDC,
  },
  {
    token: USDT,
  },
  {
    token: FRAX
  },
  {
    token: MIM
  },
  {
    token: RENBTC
  },
  {
    token: ETH,
  },
  {
    token: WETH,
  },
  {
    token: ALETH
  },
  {
    token: STETH
  },
  {
    token: LUSD
  },
  {
    token: SBTC
  },
]

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
  let zapper: NeuronLiquidityPoolZapIn
  let pair: string
  let initSnapshot: string
  let lpPair: ERC20

  const initDexTokenAmount = parseEther('100')
  const initDexEthAmount = parseEther('200')

  before(async () => {
    await deployments.fixture(['NeuronToken', 'NeuronLiquidityPoolZapIn'])

    const accounts = await ethers.getSigners()
    signer = accounts[0]
    const transferAllower = accounts[10]

    const NeuronTokenDeployment = await deployments.get('NeuronToken')
    const NeuronLiquidityPoolZapInDeployment = await deployments.get('NeuronLiquidityPoolZapIn')

    token = NeuronToken__factory.connect(NeuronTokenDeployment.address, signer)
    zapper = NeuronLiquidityPoolZapIn__factory.connect(NeuronLiquidityPoolZapInDeployment.address, signer)

    const uniRouter = IUniswapRouterV2__factory.connect(UNISWAP_ROUTER_V2, signer)
    const uniFactory = IUniswapV2Factory__factory.connect(UNISWAP_FACTORY_V2, signer)
    const weth = IWETH__factory.connect(WETH, signer) as IWETH & ERC20

    await token.connect(transferAllower).allowTranfers()

    await uniFactory.createPair(token.address, weth.address)
    pair = await uniFactory.getPair(token.address, weth.address)
    lpPair = ERC20__factory.connect(pair, signer)

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

  for (const config of CONFIGS) {
    const testToken = config.token
    it(`token test ${testToken}`, async () => {
      const zapInTokenAddress = testToken
      const zapInTokenContract = ERC20__factory.connect(zapInTokenAddress, signer)

      let zapInAmount: BigNumber
      if (zapInTokenAddress != ETH) {
        await ERC20Minter.mint(zapInTokenAddress, ethers.utils.parseEther('1000'), signer.address)
        zapInAmount = await zapInTokenContract.balanceOf(signer.address)
      } else {
        zapInAmount = ethers.utils.parseEther('1000')
      }

      let swapTarget: string
      let swapData: string

      if (testToken != WETH) {
        const zeroXSwapResponse = (
          await zeroXSQuoteRequest('', {
            params: {
              sellToken: zapInTokenAddress,
              buyToken: WETH,
              sellAmount: zapInAmount.toString(),
            },
          })
        ).data

        swapTarget = zeroXSwapResponse.to
        swapData = zeroXSwapResponse.data
      } else {
        swapTarget = WETH
        swapData = ethers.constants.HashZero
      }

      const initialLpBalance = await lpPair.balanceOf(signer.address)

      if (zapInTokenAddress != ETH) {
        await zapInTokenContract.approve(zapper.address, zapInAmount)
        await zapper.ZapIn(zapInTokenAddress, pair, zapInAmount, 0, swapTarget, swapData, true)
      } else {
        await zapper.ZapIn(zapInTokenAddress, pair, zapInAmount, 0, swapTarget, swapData, true, { value: zapInAmount })
      }

      const resultLpBalance = await lpPair.balanceOf(signer.address)

      assert(resultLpBalance.gt(initialLpBalance), 'LP pair balance is zero')
    })
  }
})
