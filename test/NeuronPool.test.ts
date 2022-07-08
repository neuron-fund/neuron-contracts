import { ethers, deployments } from 'hardhat'
import { BigNumber, Signer } from 'ethers'
import { assert } from 'chai'
import { INeuronPool } from '../typechain-types'
import {
  ALETH,
  ALETH_ETH,
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
  STETH,
  STE_CRV,
  USDC,
  USDT,
  WBTC,
  ETH,
} from '../constants/addresses'
import { expectRevert } from '@openzeppelin/test-helpers'
import ERC20Minter from './helpers/ERC20Minter'
import TokenHelper from './helpers/TokenHelper'

interface Config {
  name: string
  tokens: string[]
  errorToken: string
}

const configs: Config[] = [
  {
    name: 'NeuronPoolCurve3pool',
    tokens: [CRV3, DAI, USDC, USDT],
    errorToken: FRAX3CRV,
  },
  {
    name: 'NeuronPoolCurveFrax',
    tokens: [FRAX3CRV, FRAX, CRV3, DAI, USDC, USDT],
    errorToken: MIM3CRV,
  },
  {
    name: 'NeuronPoolCurveHBTC',
    tokens: [HCRV, HBTC, WBTC, USDC],
    errorToken: FRAX3CRV,
  },
  {
    name: 'NeuronPoolCurveMIM',
    tokens: [MIM3CRV, MIM, CRV3, DAI, USDC, USDT],
    errorToken: FRAX3CRV,
  },
  {
    name: 'NeuronPoolCurveRen',
    tokens: [REN_CRV, RENBTC, WBTC, USDC],
    errorToken: FRAX3CRV,
  },
  {
    name: 'NeuronPoolCurveALETH',
    tokens: [ALETH_ETH, ETH, ALETH, USDC],
    errorToken: FRAX3CRV,
  },
  {
    name: 'NeuronPoolCurveSTETH',
    tokens: [STE_CRV, ETH, STETH, USDC],
    errorToken: FRAX3CRV,
  },
  {
    name: 'NeuronPoolStabilityPoolLUSD',
    tokens: [LUSD, USDC],
    errorToken: FRAX3CRV,
  },
]

describe('NeuronPools', () => {
  for (const config of configs) {
    testNeuronPool(config)
  }
})

function testNeuronPool(config: Config) {
  describe(`NeuronPool.sol ${config.name}`, () => {
    // --------------------------------------------------------
    // ----------------------  DEPLOY  ------------------------
    // --------------------------------------------------------

    let neuronPool: INeuronPool
    let user: Signer
    let initSnapshot: string;

    before(async () => {
      await deployments.fixture([config.name])
      const NeuronPoolDeployment = await deployments.get(config.name)
      const accounts = await ethers.getSigners()
      user = accounts[10]
      neuronPool = (await ethers.getContractAt('INeuronPool', NeuronPoolDeployment.address)) as INeuronPool
      initSnapshot = await ethers.provider.send('evm_snapshot', [])
    })

    afterEach(async () => {
      ethers.provider.send('evm_revert', [initSnapshot])
    })

    // --------------------------------------------------------
    // ------------------  REGULAR TESTS  ---------------------
    // --------------------------------------------------------

    // this it('Regular test tokens')
    for (let i = 0; i < config.tokens.length; i++) {
      const tokenAddress = config.tokens[i]
      it(`Regular test: deposit and withdraw tokens (index = ${i}; address = ${tokenAddress})`, async () => {
        const token = await TokenHelper.getToken(tokenAddress, user)
        let tokenBalance: BigNumber;
        if(tokenAddress == ETH) {
          tokenBalance = ethers.utils.parseEther('1');
        } else {
          await ERC20Minter.mint(tokenAddress, ethers.utils.parseEther('1'), await user.getAddress())
          tokenBalance = await balanceOf(token, user)
        }

        const initialNeuronTokensBalance = await neuronPool.balanceOf(await user.getAddress())
        if(tokenAddress != ETH) {
          await token.connect(user).approve(neuronPool.address, tokenBalance)
        }
        
        await neuronPool.connect(user).deposit(tokenAddress, tokenBalance, tokenAddress == ETH ? {value:  tokenBalance} : null)
        const resultNeuronTokensBalance = await neuronPool.balanceOf(await user.getAddress())
        const neuronTokensBalance = resultNeuronTokensBalance.sub(initialNeuronTokensBalance)

        assert(
          neuronTokensBalance.gt(0),
          `Neuron tokens not minted. Token index = ${i}; Token address = ${tokenAddress}`
        )

        const initialTokenBalance = await balanceOf(token, user)
        await neuronPool.connect(user).withdraw(tokenAddress, neuronTokensBalance)
        const resultTokenBalance = await balanceOf(token, user)

        assert(
          resultTokenBalance.gt(initialTokenBalance),
          `Tokens not withdrawn. Token index = ${i}; Token address = ${tokenAddress}`
        )
      })
    }

    async function balanceOf(token, signer: Signer) {
      return token.address == ETH ? await signer.getBalance() : await token.balanceOf(await user.getAddress());
    }

    it('Get supported tokens', async () => {
      const tokens = await neuronPool.getSupportedTokens()
      console.log(config.tokens)
      console.log(tokens)
      assert(JSON.stringify(tokens) === JSON.stringify(config.tokens), 'Supported tokens not equals')
    })

    // --------------------------------------------------------
    // -------------------  SAFETY TESTS  ---------------------
    // --------------------------------------------------------

    it(`SAFETY test: deposit unregistred token (address = ${config.errorToken})`, async () => {
      const tokenAddress = config.errorToken
      const token = await TokenHelper.getToken(tokenAddress, user)
      await ERC20Minter.mint(tokenAddress, ethers.utils.parseEther('1'), await user.getAddress())
      const tokenBalance = await token.balanceOf(await user.getAddress())

      await token.connect(user).approve(neuronPool.address, tokenBalance)
      await expectRevert(neuronPool.connect(user).deposit(tokenAddress, tokenBalance), '!token')
    })

    it(`SAFETY test: withdraw unregistred token (address = ${config.errorToken})`, async () => {
      // deposit before test
      const depositTokenAddress = config.tokens[0]
      const token = await TokenHelper.getToken(depositTokenAddress, user)
      await ERC20Minter.mint(depositTokenAddress, ethers.utils.parseEther('1'), await user.getAddress())
      const tokenBalance = await token.balanceOf(await user.getAddress())

      const initialNeuronTokensBalance = await neuronPool.balanceOf(await user.getAddress())
      await token.connect(user).approve(neuronPool.address, tokenBalance)
      await neuronPool.connect(user).deposit(depositTokenAddress, tokenBalance)
      const resultNeuronTokensBalance = await neuronPool.balanceOf(await user.getAddress())
      const neuronTokensBalance = resultNeuronTokensBalance.sub(initialNeuronTokensBalance)

      assert(
        neuronTokensBalance.gt(0),
        `SAFETY test withdraw: Neuron tokens not minted. Deposit token index = ${0}; Token address = ${depositTokenAddress}`
      )

      // test
      const tokenAddress = config.errorToken
      await expectRevert(neuronPool.connect(user).withdraw(tokenAddress, neuronTokensBalance), '!token')
    })
  })
}
