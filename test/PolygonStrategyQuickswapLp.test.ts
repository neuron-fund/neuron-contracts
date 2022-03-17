
import "@nomiclabs/hardhat-ethers"
import { ethers, network } from "hardhat"
import { BigNumber, Signer, constants as ethersConstants, ContractFactory, BigNumberish, ContractTransaction } from "ethers"
import { AxonVyper__factory, Controller__factory, FeeDistributor__factory, ICurveFiPolygon2__factory, ICurveFiPolygon3__factory, IERC20, IERC20__factory, IPolygonWETH__factory, IUniswapRouterV2__factory, IWETH__factory, MasterChef__factory, NeuronPool__factory, NeuronToken__factory, PolygonStrategyCurveAm3Crv__factory, StrategySushiDoubleEthAlcxLp__factory, StrategySushiDoubleEthCvxLp__factory, StrategySushiDoubleEthPickleLp__factory, StrategySushiDoubleEthRulerLp__factory } from '../typechain'
import { POLYGON_CURVE_AM_3_CRV_LP_TOKEN, POLYGON_CURVE_AM_3_CRV_POOL, POLYGON_CURVE_CRV, POLYGON_CURVE_REN_BTC_LP_TOKEN, POLYGON_CURVE_REN_BTC_POOL, POLYGON_DAI, POLYGON_MI_MATIC, POLYGON_QUICK, POLYGON_QUICKSWAP_ROUTER, POLYGON_USDC, POLYGON_USDT, POLYGON_WBTC, POLYGON_WETH, POLYGON_WMATIC, SUSHISWAP_ROUTER, SUSHI_ETH_ALCX_LP, SUSHI_ETH_CVX_LP, SUSHI_ETH_PICKLE_LP, SUSHI_ETH_RULER_LP, WETH } from '../constants/addresses'
import { getToken } from '../utils/getCurveTokens'
import { formatEther, parseEther } from 'ethers/lib/utils'
import { sushiGetLpToken } from '../utils/sushiTestUtils'
import { waitNDays } from '../utils/time'
import { IPolygonWMATIC__factory } from '../typechain/factories/IPolygonWMATIC__factory'
import { QuickSwapRouter__factory } from '../typechain/factories/QuickSwapRouter__factory'
import { assert } from 'chai'

describe('Token', function () {
  let accounts

  beforeEach(async function () {
    accounts = await ethers.getSigners()
    await network.provider.request({
      method: "hardhat_reset",
      params: [
        {
          forking: {
            jsonRpcUrl: process.env.ALCHEMY_POLYGON,
            blockNumber: 18271078,
          },
        },
      ],
    })
  })

  it('Test PolygonStrategyQuickswapWbtcEthLp', async function () {
    await testPolygonCurveStrategy({
      accounts,
      token0: POLYGON_WBTC,
      token1: POLYGON_WETH,
      quickswapLpToken: '0xdc9232e2df177d7a12fdff6ecbab114e2231198d',
      strategyFactory: await ethers.getContractFactory('PolygonStrategyQuickswapWbtcEthLp'),
    })
  })

  it('Test PolygonStrategyQuickswapDaiUsdcLp', async function () {
    await testPolygonCurveStrategy({
      accounts,
      token0: POLYGON_DAI,
      token1: POLYGON_USDC,
      quickswapLpToken: '0xf04adBF75cDFc5eD26eeA4bbbb991DB002036Bdd',
      strategyFactory: await ethers.getContractFactory('PolygonStrategyQuickswapDaiUsdcLp'),
    })
  })

  it('Test PolygonStrategyQuickswapDaiUsdtLp', async function () {
    await testPolygonCurveStrategy({
      accounts,
      token0: POLYGON_DAI,
      token1: POLYGON_USDT,
      quickswapLpToken: '0x59153f27eeFE07E5eCE4f9304EBBa1DA6F53CA88',
      strategyFactory: await ethers.getContractFactory('PolygonStrategyQuickswapDaiUsdtLp'),
    })
  })

  it('Test PolygonStrategyQuickswapUsdcUsdtLp', async function () {
    await testPolygonCurveStrategy({
      accounts,
      token0: POLYGON_USDC,
      token1: POLYGON_USDT,
      quickswapLpToken: '0x2cF7252e74036d1Da831d11089D326296e64a728',
      strategyFactory: await ethers.getContractFactory('PolygonStrategyQuickswapUsdcUsdtLp'),
    })
  })

  it('Test PolygonStrategyQuickswapWmaticEthLp', async function () {
    await testPolygonCurveStrategy({
      accounts,
      token0: POLYGON_WETH,
      token1: POLYGON_WMATIC,
      quickswapLpToken: '0xadbF1854e5883eB8aa7BAf50705338739e558E5b',
      strategyFactory: await ethers.getContractFactory('PolygonStrategyQuickswapWmaticEthLp'),
    })
  })
  

  it('Test PolygonStrategyQuickswapMimaticUsdcLp', async function () {
    await testPolygonCurveStrategy({
      accounts,
      token0: POLYGON_USDC,
      token1: POLYGON_MI_MATIC,
      quickswapLpToken: '0x160532D2536175d65C03B97b0630A9802c274daD',
      strategyFactory: await ethers.getContractFactory('PolygonStrategyQuickswapMimaticUsdcLp'),
    })
  })
})


const getDexDeadline = () => Math.floor(Date.now() / 1000) + 20000000

async function testPolygonCurveStrategy<T extends ContractFactory> ({
  accounts,
  token0,
  token1,
  quickswapLpToken,
  strategyFactory,
}: {
  accounts: Signer[],
  token0: string,
  token1: string,
  quickswapLpToken: string,
  strategyFactory: T,
}
) {
  const deployer = accounts[0]
  const governance = deployer
  const strategist = deployer
  const timelock = deployer
  const devfund = accounts[1]
  const treasury = accounts[2]
  const user = accounts[3]

  const deployerAddress = await deployer.getAddress()
  const governanceAddress = await governance.getAddress()
  const devAddress = await devfund.getAddress()
  const treasuryAddress = await treasury.getAddress()
  const timelockAddress = await timelock.getAddress()
  const userAddress = await user.getAddress()

  const polygonWeth = await IERC20__factory.connect(POLYGON_WETH, deployer)
  const polygonWmatic = await IPolygonWMATIC__factory.connect(POLYGON_WMATIC, deployer)

  const neuronsPerBlock = parseEther('0.3')
  const startBlock = 0
  const bonusEndBlock = 0

  const NeuronToken = await ethers.getContractFactory('NeuronToken') as NeuronToken__factory
  const Masterchef = await ethers.getContractFactory('MasterChef', deployer) as MasterChef__factory
  const AxonVyper = await ethers.getContractFactory('AxonVyper', deployer) as AxonVyper__factory
  const FeeDistributor = await ethers.getContractFactory('FeeDistributor', deployer) as FeeDistributor__factory

  const neuronToken = await NeuronToken.deploy(governanceAddress)
  await neuronToken.deployed()
  await neuronToken.setMinter(deployerAddress)
  await neuronToken.applyMinter()
  await neuronToken.mint(deployerAddress, parseEther('100000'))
  const quickSwapRouter = await QuickSwapRouter__factory.connect(POLYGON_QUICKSWAP_ROUTER, deployer)

  await neuronToken.approve(POLYGON_QUICKSWAP_ROUTER, ethersConstants.MaxUint256)
  await polygonWeth.approve(POLYGON_QUICKSWAP_ROUTER, ethersConstants.MaxUint256)
  await polygonWmatic.approve(POLYGON_QUICKSWAP_ROUTER, ethersConstants.MaxUint256)

  // Get wmatic from matic
  console.log('MATIC BALACE BEFORE WRAP', formatEther(await deployer.getBalance()))
  const wmaticWrapAmount = parseEther('1000000')
  await polygonWmatic.deposit({ value: wmaticWrapAmount })

  console.log('Wmatic balance after swap', formatEther(await polygonWmatic.balanceOf(deployerAddress)))
  console.log('is enough wmatic', await (await polygonWmatic.balanceOf(deployerAddress)).gte(parseEther('10')))

  // Swap wmatic to weth
  await quickSwapRouter.swapExactTokensForTokens(
    parseEther('1000000'),
    0,
    [POLYGON_WMATIC, POLYGON_WETH],
    deployerAddress,
    getDexDeadline()
  )

  console.log('weth balance before liquidity', formatEther(await polygonWeth.balanceOf(deployerAddress),))
  console.log('neuron balance before liquidity', formatEther(await neuronToken.balanceOf(deployerAddress)))

  await quickSwapRouter.addLiquidity(
    POLYGON_WETH,
    neuronToken.address,
    parseEther('10'),
    parseEther('1000'),
    0,
    0,
    deployerAddress,
    getDexDeadline(),
    {
      gasPrice: ethers.utils.parseUnits('10', 'gwei'),
      gasLimit: 1000000000,
    }
  )

  const masterChef = await Masterchef.deploy(neuronToken.address, governanceAddress, devAddress, treasuryAddress, neuronsPerBlock, startBlock, bonusEndBlock)
  await masterChef.deployed()

  await neuronToken.setMinter(masterChef.address)
  await neuronToken.applyMinter()
  await neuronToken.setMinter(deployerAddress)
  await neuronToken.applyMinter()

  const Controller = await ethers.getContractFactory('Controller') as Controller__factory

  const controller = await Controller.deploy(
    await governance.getAddress(),
    await strategist.getAddress(),
    await timelock.getAddress(),
    await devfund.getAddress(),
    await treasury.getAddress()
  )


  const axon = await AxonVyper.deploy(neuronToken.address, 'veNEUR token', 'veNEUR', '1.0')
  await axon.deployed()
  const currentBlock = await network.provider.send("eth_getBlockByNumber", ["latest", true])
  const feeDistributor = await FeeDistributor.deploy(axon.address, currentBlock.timestamp, neuronToken.address, deployerAddress, deployerAddress)

  const strategy = await strategyFactory.deploy(
    await governance.getAddress(),
    await strategist.getAddress(),
    controller.address,
    neuronToken.address,
    await timelock.getAddress()
  )

  const NeuronPool = await ethers.getContractFactory('NeuronPool') as NeuronPool__factory
  const neuronPool = await NeuronPool.deploy(
    await strategy.want(),
    governanceAddress,
    timelockAddress,
    controller.address,
    masterChef.address
  )
  await neuronPool.deployed()

  await controller.setNPool(await strategy.want(), neuronPool.address)
  await controller.approveStrategy(await strategy.want(), strategy.address)
  await controller.setStrategy(await strategy.want(), strategy.address)

  // Getting token0

  await polygonWeth.connect(deployer).approve(POLYGON_QUICKSWAP_ROUTER, ethersConstants.MaxUint256)

  if (token0 !== POLYGON_WETH) {
    await quickSwapRouter.swapExactTokensForTokens(
      parseEther('20'),
      0,
      [POLYGON_WETH, token0],
      deployerAddress,
      getDexDeadline()
    )
  }

  // Getting token1

  if (token1 !== POLYGON_WETH) {
    await quickSwapRouter.swapExactTokensForTokens(
      parseEther('20'),
      0,
      [POLYGON_WETH, token1],
      deployerAddress,
      getDexDeadline()
    )
  }

  // Getting quickswap lp token

  const token0Contract = await IERC20__factory.connect(token0, deployer)
  const token1Contract = await IERC20__factory.connect(token1, deployer)

  await token0Contract.approve(POLYGON_QUICKSWAP_ROUTER, ethersConstants.MaxUint256)
  await token1Contract.approve(POLYGON_QUICKSWAP_ROUTER, ethersConstants.MaxUint256)

  await quickSwapRouter.addLiquidity(
    token0,
    token1,
    await token0Contract.balanceOf(deployerAddress),
    await token1Contract.balanceOf(deployerAddress),
    0,
    0,
    deployerAddress,
    getDexDeadline()
  ) 

  const quickswapLpTokenContract = await IERC20__factory.connect(quickswapLpToken, deployer)
  await quickswapLpTokenContract.transfer(userAddress, await quickswapLpTokenContract.balanceOf(deployerAddress))

  await quickswapLpTokenContract.connect(user).approve(neuronPool.address, ethersConstants.MaxUint256)

  const lpTokenBalanceInitial = await quickswapLpTokenContract.balanceOf(userAddress)
  await quickswapLpTokenContract.approve(neuronPool.address, ethersConstants.MaxUint256)

  console.log('Connect user to pool')
  const neuronPoolUserConnected = await neuronPool.connect(user)
  console.log('Depositing to pool')
  await neuronPoolUserConnected.depositAndFarm(lpTokenBalanceInitial)
  console.log('Execute pools earn function')
  await neuronPool.earn()

  console.log('Time travel one week later')
  const oneWeekInSeconds = 60 * 60 * 24 * 7
  await network.provider.send('evm_increaseTime', [oneWeekInSeconds])
  await network.provider.send('evm_mine')

  console.log('Strategy harvest')
  await strategy.harvest()

  const rewardTokenAddress = POLYGON_QUICK
  const rewardContract = await IERC20__factory.connect(rewardTokenAddress, deployer)
  const treasureAmount = await rewardContract.balanceOf(treasuryAddress)
  assert(treasureAmount.gte(0), `No rewards for token ${rewardTokenAddress} in treasury`)
}