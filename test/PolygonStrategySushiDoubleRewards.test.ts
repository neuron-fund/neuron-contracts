
import "@nomiclabs/hardhat-ethers"
import { ethers, network } from "hardhat"
import { BigNumber, Signer, constants as ethersConstants, ContractFactory } from "ethers"
import { AxonVyper__factory, Controller__factory, FeeDistributor__factory, IERC20__factory, IUniswapRouterV2__factory, IWETH__factory, MasterChef__factory, NeuronPool__factory, NeuronToken__factory } from '../typechain'
import { POLYGON_DAI, POLYGON_PICKLE, POLYGON_QUICKSWAP_ROUTER, POLYGON_WETH, POLYGON_WMATIC, POLYGON_SUSHISWAP_ROUTER, POLYGON_SUSHI } from '../constants/addresses'
import { formatEther, parseEther } from 'ethers/lib/utils'
import { waitNDays } from '../utils/time'
import { PolygonStrategySushiDoubleDaiPickleLp__factory } from '../typechain/factories/PolygonStrategySushiDoubleDaiPickleLp__factory'
import { IPolygonWMATIC__factory } from '../typechain/factories/IPolygonWMATIC__factory'
import { QuickSwapRouter__factory } from '../typechain/factories/QuickSwapRouter__factory'
import { assert } from 'chai'

const getDexDeadline = () => Math.floor(Date.now() / 1000) + 20000000

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

  it('Test PolygonStrategySushiDoubleDaiPickleLp', async function () {
    await testSushiDoubleRewards({
      accounts,
      token0: POLYGON_DAI,
      token1: POLYGON_PICKLE,
      rewardToken0: POLYGON_SUSHI,
      rewardToken1: POLYGON_WMATIC,
      lpAddress: '0x57602582eB5e82a197baE4E8b6B80E39abFC94EB',
      strategyFactory: await ethers.getContractFactory('PolygonStrategySushiDoubleDaiPickleLp') as PolygonStrategySushiDoubleDaiPickleLp__factory
    })
  })

})

async function testSushiDoubleRewards<T extends ContractFactory> ({
  accounts,
  token0,
  token1,
  rewardToken0,
  rewardToken1,
  lpAddress,
  strategyFactory
}: {
  accounts: Signer[],
  token0: string,
  token1: string,
  rewardToken0: string,
  rewardToken1: string,
  lpAddress: string,
  strategyFactory: T
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

  const neuronsPerBlock = parseEther('0.3')
  const startBlock = 0
  const bonusEndBlock = 0

  const polygonWeth = await IWETH__factory.connect(POLYGON_WETH, deployer)
  const polygonWmatic = await IPolygonWMATIC__factory.connect(POLYGON_WMATIC, deployer)
  const sushiRouter = await IUniswapRouterV2__factory.connect(POLYGON_SUSHISWAP_ROUTER, deployer)
  const quickSwapRouter = await QuickSwapRouter__factory.connect(POLYGON_QUICKSWAP_ROUTER, deployer)
  const NeuronToken = await ethers.getContractFactory('NeuronToken') as NeuronToken__factory
  const Masterchef = await ethers.getContractFactory('MasterChef', deployer) as MasterChef__factory
  const AxonVyper = await ethers.getContractFactory('AxonVyper', deployer) as AxonVyper__factory
  const FeeDistributor = await ethers.getContractFactory('FeeDistributor', deployer) as FeeDistributor__factory

  const neuronToken = await NeuronToken.deploy(governanceAddress)
  await neuronToken.deployed()
  await neuronToken.setMinter(deployerAddress)
  await neuronToken.applyMinter()
  await neuronToken.mint(deployerAddress, parseEther('100000'))

  await neuronToken.approve(POLYGON_QUICKSWAP_ROUTER, ethersConstants.MaxUint256)
  await polygonWeth.approve(POLYGON_QUICKSWAP_ROUTER, ethersConstants.MaxUint256)
  await polygonWmatic.approve(POLYGON_QUICKSWAP_ROUTER, ethersConstants.MaxUint256)
  await neuronToken.approve(POLYGON_SUSHISWAP_ROUTER, ethersConstants.MaxUint256)
  await polygonWeth.approve(POLYGON_SUSHISWAP_ROUTER, ethersConstants.MaxUint256)
  await polygonWmatic.approve(POLYGON_SUSHISWAP_ROUTER, ethersConstants.MaxUint256)

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

  await sushiRouter.addLiquidity(
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
    masterChef.address,
  )
  await neuronPool.deployed()

  await controller.setNPool(await strategy.want(), neuronPool.address)
  await controller.approveStrategy(await strategy.want(), strategy.address)
  await controller.setStrategy(await strategy.want(), strategy.address)

  // Getting token0

  await polygonWeth.connect(deployer).approve(POLYGON_QUICKSWAP_ROUTER, ethersConstants.MaxUint256)

  if (token0 !== POLYGON_WETH) {
    await sushiRouter.swapExactTokensForTokens(
      parseEther('20'),
      0,
      [POLYGON_WETH, token0],
      deployerAddress,
      getDexDeadline()
    )
  }

  // Getting token1

  if (token1 !== POLYGON_WETH) {
    await sushiRouter.swapExactTokensForTokens(
      parseEther('20'),
      0,
      [POLYGON_WETH, token1],
      deployerAddress,
      getDexDeadline()
    )
  }

  // Getting sushi lp token

  const token0Contract = await IERC20__factory.connect(token0, deployer)
  const token1Contract = await IERC20__factory.connect(token1, deployer)

  await token0Contract.approve(POLYGON_SUSHISWAP_ROUTER, ethersConstants.MaxUint256)
  await token1Contract.approve(POLYGON_SUSHISWAP_ROUTER, ethersConstants.MaxUint256)

  await sushiRouter.addLiquidity(
    token0,
    token1,
    await token0Contract.balanceOf(deployerAddress),
    await token1Contract.balanceOf(deployerAddress),
    0,
    0,
    deployerAddress,
    getDexDeadline()
  )

  const sushiLpTokenContract = await IERC20__factory.connect(lpAddress, deployer)
  await sushiLpTokenContract.transfer(userAddress, await sushiLpTokenContract.balanceOf(deployerAddress))

  await sushiLpTokenContract.connect(user).approve(neuronPool.address, ethersConstants.MaxUint256)

  const lpTokenBalanceInitial = await sushiLpTokenContract.balanceOf(userAddress)
  await sushiLpTokenContract.approve(neuronPool.address, ethersConstants.MaxUint256)

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

  const reward0Contract = await IERC20__factory.connect(rewardToken0, deployer)
  const treasureReward0Amount = await reward0Contract.balanceOf(treasuryAddress)
  assert(treasureReward0Amount.gte(0), `No rewards for token ${rewardToken0} in treasury`)

  const rewardToken1Contract = await IERC20__factory.connect(rewardToken1, deployer)
  const treasureReward1Amount = await rewardToken1Contract.balanceOf(treasuryAddress)
  assert(treasureReward1Amount.gte(0), `No rewards for token ${rewardToken1} in treasury`)
}