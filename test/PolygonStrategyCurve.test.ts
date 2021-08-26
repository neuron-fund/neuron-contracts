
import "@nomiclabs/hardhat-ethers"
import { ethers, network } from "hardhat"
import { BigNumber, Signer, constants as ethersConstants, ContractFactory, BigNumberish, ContractTransaction } from "ethers"
import { AxonVyper__factory, Controller__factory, FeeDistributor__factory, GaugesDistributor__factory, ICurveFiPolygon2__factory, ICurveFiPolygon3__factory, IERC20, IERC20__factory, IPolygonWETH__factory, IUniswapRouterV2__factory, IWETH__factory, MasterChef__factory, NeuronPool__factory, NeuronToken__factory, PolygonStrategyCurveAm3Crv__factory, StrategySushiDoubleEthAlcxLp__factory, StrategySushiDoubleEthCvxLp__factory, StrategySushiDoubleEthPickleLp__factory, StrategySushiDoubleEthRulerLp__factory } from '../typechain'
import { POLYGON_CURVE_AM_3_CRV_LP_TOKEN, POLYGON_CURVE_AM_3_CRV_POOL, POLYGON_CURVE_CRV, POLYGON_CURVE_REN_BTC_LP_TOKEN, POLYGON_CURVE_REN_BTC_POOL, POLYGON_DAI, POLYGON_QUICKSWAP_ROUTER, POLYGON_WBTC, POLYGON_WETH, POLYGON_WMATIC, SUSHISWAP_ROUTER, SUSHI_ETH_ALCX_LP, SUSHI_ETH_CVX_LP, SUSHI_ETH_PICKLE_LP, SUSHI_ETH_RULER_LP, WETH } from '../constants/addresses'
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

  it('Test PolygonStrategyCurveAm3Crv', async function () {
    await testPolygonCurveStrategy({
      accounts,
      curveLp: POLYGON_CURVE_AM_3_CRV_POOL,
      curveLiquidityProvidingToken: POLYGON_DAI,
      curveLpToken: POLYGON_CURVE_AM_3_CRV_LP_TOKEN,
      strategyFactory: await ethers.getContractFactory('PolygonStrategyCurveAm3Crv'),
      provideCurveLiquidity: (signer, amount) => ICurveFiPolygon3__factory.connect(POLYGON_CURVE_AM_3_CRV_POOL, signer)['add_liquidity(uint256[3],uint256,bool)']([amount, 0, 0], 0, true, { gasLimit: 1000000000 }),
      strategyRewardTokensAddresses: [POLYGON_WMATIC, POLYGON_CURVE_CRV]
    })
  })

  it('Test PolygonStrategyCurveRenBtc', async function () {
    await testPolygonCurveStrategy({
      accounts,
      curveLp: POLYGON_CURVE_REN_BTC_POOL,
      curveLiquidityProvidingToken: POLYGON_WBTC,
      curveLpToken: POLYGON_CURVE_REN_BTC_LP_TOKEN,
      strategyFactory: await ethers.getContractFactory('PolygonStrategyCurveRenBtc'),
      provideCurveLiquidity: (signer, amount) => ICurveFiPolygon2__factory.connect(POLYGON_CURVE_REN_BTC_POOL, signer)['add_liquidity(uint256[2],uint256,bool)']([amount, 0], 0, true, { gasLimit: 1000000000 }),
      strategyRewardTokensAddresses: [POLYGON_WMATIC, POLYGON_CURVE_CRV]
    })
  })
})

const getDexDeadline = () => Math.floor(Date.now() / 1000) + 20000000

async function testPolygonCurveStrategy<T extends ContractFactory> ({
  accounts,
  curveLiquidityProvidingToken,
  curveLp,
  curveLpToken,
  strategyFactory,
  provideCurveLiquidity,
  strategyRewardTokensAddresses
}: {
  accounts: Signer[]
  curveLiquidityProvidingToken: string
  curveLp: string
  curveLpToken: string,
  provideCurveLiquidity: (signer: Signer, amount: BigNumber) => Promise<ContractTransaction>
  strategyFactory: T,
  strategyRewardTokensAddresses: string[]
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
  const GaugesDistributor = await ethers.getContractFactory('GaugesDistributor', deployer) as GaugesDistributor__factory
  const AxonVyper = await ethers.getContractFactory('AxonVyper', deployer) as AxonVyper__factory
  const FeeDistributor = await ethers.getContractFactory('FeeDistributor', deployer) as FeeDistributor__factory

  const neuronToken = await NeuronToken.deploy(governanceAddress)
  await neuronToken.deployed()
  await neuronToken.setMinter(deployerAddress)
  await neuronToken.applyMinter()
  await neuronToken.mint(deployerAddress, parseEther('100000'))
  const quickSwapRouter = await QuickSwapRouter__factory.connect(POLYGON_QUICKSWAP_ROUTER, deployer)
  const wethContract = await IPolygonWETH__factory.connect(POLYGON_WETH, deployer)

  await neuronToken.approve(POLYGON_QUICKSWAP_ROUTER, ethersConstants.MaxUint256)
  await wethContract.approve(POLYGON_QUICKSWAP_ROUTER, ethersConstants.MaxUint256)
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

  console.log('weth balance before liquidity', formatEther(await wethContract.balanceOf(deployerAddress),))
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


  const axon = await AxonVyper.deploy(neuronToken.address, 'Axon token', 'AXON', '1.0')
  await axon.deployed()
  const currentBlock = await network.provider.send("eth_getBlockByNumber", ["latest", true])
  const feeDistributor = await FeeDistributor.deploy(axon.address, currentBlock.timestamp, neuronToken.address, deployerAddress, deployerAddress)
  const gaugesDistributor = await GaugesDistributor.deploy(masterChef.address, neuronToken.address, axon.address, treasuryAddress, governanceAddress, governanceAddress)
  await gaugesDistributor.deployed()
  await masterChef.setDistributor(gaugesDistributor.address)

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
    masterChef.address,
    gaugesDistributor.address
  )
  await neuronPool.deployed()

  await controller.setNPool(await strategy.want(), neuronPool.address)
  await controller.approveStrategy(await strategy.want(), strategy.address)
  await controller.setStrategy(await strategy.want(), strategy.address)


  const neuronPoolAddress = neuronPool.address
  await gaugesDistributor.addGauge(neuronPoolAddress)
  await gaugesDistributor.setWeights([neuronPoolAddress], [BigNumber.from('100')])

  // Wait for masterchef to mint tokens for gauges distributor
  await waitNDays(10, network.provider)

  await gaugesDistributor.distribute()

  await quickSwapRouter.swapExactTokensForTokens(
    parseEther('40'),
    0,
    [POLYGON_WETH, curveLiquidityProvidingToken],
    deployerAddress,
    getDexDeadline()
  )
  const liquidityProvidingToken = await IERC20__factory.connect(curveLiquidityProvidingToken, deployer)
  await liquidityProvidingToken.transfer(userAddress, await liquidityProvidingToken.balanceOf(deployerAddress))
  await liquidityProvidingToken.connect(user).approve(curveLp, ethersConstants.MaxUint256)
  await provideCurveLiquidity(user, await liquidityProvidingToken.balanceOf(userAddress))

  const lpTokenContract = await getToken(curveLpToken, user)

  const lpTokenBalanceInitial = await lpTokenContract.balanceOf(userAddress)
  await lpTokenContract.approve(neuronPool.address, ethersConstants.MaxUint256)

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

  for (const rewardTokenAddress of strategyRewardTokensAddresses) {
    const rewardContract = await IERC20__factory.connect(rewardTokenAddress, deployer)
    const treasureAmount = await rewardContract.balanceOf(treasuryAddress)
    assert(treasureAmount.gte(0), `No rewards for token ${rewardTokenAddress} in treasury`)
  }
}