import { ethers, network, deployments } from 'hardhat'
import { Signer } from 'ethers'
import { assert } from 'chai'
import { expectRevert } from '@openzeppelin/test-helpers'
import { INeuronPool, NeuronPoolBase } from '../typechain-types'
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
  USDC,
  USDP,
  USDP3CRV,
  USDT,
  UST,
} from '../constants/addresses'
import TokenHelper from './helpers/TokenHelper'
import NetworkHelper from './helpers/NetworkHelper'

interface Config {
  name: string
  tokens: string[]
  errorToken: string
}

const configs: Config[] = [
  // {
  //   name: 'NeuronPoolCurve3pool',
  //   tokens: [CRV3, DAI, USDC, USDT],
  //   errorToken: FRAX3CRV,
  // },
  {
    name: 'NeuronPoolCurveFrax',
    tokens: [CRV3],
    errorToken: LUSD3CRV,
  },
  // {
  //   name: 'NeuronPoolCurveLUSD',
  //   tokens: [LUSD3CRV, LUSD, CRV3, DAI, USDC, USDT],
  //   errorToken: FRAX3CRV,
  // },
  // {
  //   name: 'NeuronPoolCurveALUSD',
  //   tokens: [ALUSD3CRV, ALUSD, CRV3, DAI, USDC, USDT],
  //   errorToken: FRAX3CRV,
  // },
  // {
  //   name: 'NeuronPoolCurveMIM',
  //   tokens: [MIM3CRV, MIM, CRV3, DAI, USDC, USDT],
  //   errorToken: FRAX3CRV,
  // },
  // {
  //   name: 'NeuronPoolCurveUSDP',
  //   tokens: [USDP3CRV, USDP, CRV3, DAI, USDC, USDT],
  //   errorToken: FRAX3CRV,
  // },
  // {
  //   name: 'NeuronPoolCurveMIMUST',
  //   tokens: [MIMUST, MIM, UST],
  //   errorToken: FRAX3CRV,
  // },
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

    beforeEach(async () => {
      await NetworkHelper.reset()
      await deployments.fixture([config.name])
      const NeuronPoolDeployment = await deployments.get(config.name)
      const accounts = await ethers.getSigners()
      user = accounts[10]
      neuronPool = (await ethers.getContractAt('INeuronPool', NeuronPoolDeployment.address)) as INeuronPool
    })

    // --------------------------------------------------------
    // ------------------  REGULAR TESTS  ---------------------
    // --------------------------------------------------------

    // this it('Regular test tokens')
    for (let i = 0; i < config.tokens.length; i++) {
      const tokenAddress = config.tokens[i]
      it(`Regular test: deposit and withdraw tokens (index = ${i}; address = ${tokenAddress})`, async () => {
        const token = await TokenHelper.getToken(tokenAddress, user)
        await TokenHelper.createTokens(tokenAddress, user)
        const tokenBalance = await token.balanceOf(await user.getAddress())

        const initialNeuronTokensBalance = await neuronPool.balanceOf(await user.getAddress())
        await token.connect(user).approve(neuronPool.address, tokenBalance)
        await neuronPool.connect(user).deposit(tokenAddress, tokenBalance)
        const resultNeuronTokensBalance = await neuronPool.balanceOf(await user.getAddress())
        const neuronTokensBalance = resultNeuronTokensBalance.sub(initialNeuronTokensBalance)

        assert(
          neuronTokensBalance.gt(0),
          `Neuron tokens not minted. Token index = ${i}; Token address = ${tokenAddress}`
        )

        const initialTokenBalance = await token.balanceOf(await user.getAddress())
        await neuronPool.connect(user).withdraw(tokenAddress, neuronTokensBalance)
        const resultTokenBalance = await token.balanceOf(await user.getAddress())

        assert(
          resultTokenBalance.gt(initialTokenBalance),
          `Tokens not withdrawn. Token index = ${i}; Token address = ${tokenAddress}`
        )
      })
    }

  //   it('Get supported tokens', async () => {
  //     const tokens = await neuronPool.getSupportedTokens()
  //     console.log(config.tokens)
  //     console.log(tokens)
  //     assert(JSON.stringify(tokens) === JSON.stringify(config.tokens), 'Supported tokens not equals')
  //   })

  //   // --------------------------------------------------------
  //   // -------------------  SAFETY TESTS  ---------------------
  //   // --------------------------------------------------------

  //   it(`SAFETY test: deposit unregistred token (address = ${config.errorToken})`, async () => {
  //     const tokenAddress = config.errorToken
  //     const token = await TokenHelper.getToken(tokenAddress, user)
  //     await TokenHelper.createTokens(tokenAddress, user)
  //     const tokenBalance = await token.balanceOf(await user.getAddress())

  //     await token.connect(user).approve(neuronPool.address, tokenBalance)
  //     await expectRevert(neuronPool.connect(user).deposit(tokenAddress, tokenBalance), '!token')
  //   })

  //   it(`SAFETY test: withdraw unregistred token (address = ${config.errorToken})`, async () => {
  //     // deposit before test
  //     const depositTokenAddress = config.tokens[0]
  //     const token = await TokenHelper.getToken(depositTokenAddress, user)
  //     await TokenHelper.createTokens(depositTokenAddress, user)
  //     const tokenBalance = await token.balanceOf(await user.getAddress())

  //     const initialNeuronTokensBalance = await neuronPool.balanceOf(await user.getAddress())
  //     await token.connect(user).approve(neuronPool.address, tokenBalance)
  //     await neuronPool.connect(user).deposit(depositTokenAddress, tokenBalance)
  //     const resultNeuronTokensBalance = await neuronPool.balanceOf(await user.getAddress())
  //     const neuronTokensBalance = resultNeuronTokensBalance.sub(initialNeuronTokensBalance)

  //     assert(
  //       neuronTokensBalance.gt(0),
  //       `SAFETY test withdraw: Neuron tokens not minted. Deposit token index = ${0}; Token address = ${depositTokenAddress}`
  //     )

  //     // test
  //     const tokenAddress = config.errorToken
  //     await expectRevert(neuronPool.connect(user).withdraw(tokenAddress, neuronTokensBalance), '!token')
  //   })
  })
}
