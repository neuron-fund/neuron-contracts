
import "@nomiclabs/hardhat-ethers"
import { ethers, network } from "hardhat"
import { BigNumber, Signer, constants as ethersConstants, ContractFactory } from "ethers"
import { AxonVyper__factory, Controller__factory, FeeDistributor__factory, GaugesDistributor__factory, IUniswapRouterV2__factory, IWETH__factory, MasterChef__factory, NeuronPool__factory, NeuronToken__factory, StrategySushiDoubleEthAlcxLp__factory, StrategySushiDoubleEthCvxLp__factory, StrategySushiDoubleEthPickleLp__factory, StrategySushiDoubleEthRulerLp__factory } from '../typechain'
import { SUSHISWAP_ROUTER, SUSHI_ETH_ALCX_LP, SUSHI_ETH_CVX_LP, SUSHI_ETH_PICKLE_LP, SUSHI_ETH_RULER_LP, WETH } from '../constants/addresses'
import { getToken } from '../utils/getCurveTokens'
import { formatEther, parseEther } from 'ethers/lib/utils'
import { sushiGetLpToken } from '../utils/sushiTestUtils'
import { waitNDays } from '../utils/time'

describe('Token', function () {
  let accounts

  beforeEach(async function () {
    accounts = await ethers.getSigners()
    await network.provider.request({
      method: "hardhat_reset",
      params: [
        {
          forking: {
            jsonRpcUrl: process.env.ALCHEMY,
            blockNumber: 13057623,
          },
        },
      ],
    })
  })

  it('Test StrategyAlcxSushiEthAlcxLp', async function () {
    await testSushiDoubleRewards({
      accounts,
      lpAddress: SUSHI_ETH_ALCX_LP,
      strategyFactory: await ethers.getContractFactory('StrategySushiDoubleEthAlcxLp') as StrategySushiDoubleEthAlcxLp__factory
    })
  })

  it('Test StrategySushiDoubleEthPickleLp', async function () {
    await testSushiDoubleRewards({
      accounts,
      lpAddress: SUSHI_ETH_PICKLE_LP,
      strategyFactory: await ethers.getContractFactory('StrategySushiDoubleEthPickleLp') as StrategySushiDoubleEthPickleLp__factory
    })
  })

  it('Test StrategySushiDoubleEthCvxLp', async function () {
    await testSushiDoubleRewards({
      accounts,
      lpAddress: SUSHI_ETH_CVX_LP,
      strategyFactory: await ethers.getContractFactory('StrategySushiDoubleEthCvxLp') as StrategySushiDoubleEthCvxLp__factory
    })
  })

  it('Test StrategySushiDoubleEthRulerLp', async function () {
    await testSushiDoubleRewards({
      accounts,
      lpAddress: SUSHI_ETH_RULER_LP,
      strategyFactory: await ethers.getContractFactory('StrategySushiDoubleEthRulerLp') as StrategySushiDoubleEthRulerLp__factory
    })
  })
})

async function testSushiDoubleRewards<T extends ContractFactory> ({
  accounts,
  lpAddress,
  strategyFactory
}: { accounts: Signer[], lpAddress: string, strategyFactory: T }
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
  const sushiRouter = await IUniswapRouterV2__factory.connect(SUSHISWAP_ROUTER, deployer)
  const wethContract = await IWETH__factory.connect(WETH, deployer)
  await wethContract.deposit({ value: parseEther('10') })

  await neuronToken.approve(SUSHISWAP_ROUTER, ethersConstants.MaxUint256)
  await wethContract.approve(SUSHISWAP_ROUTER, ethersConstants.MaxUint256)

  const deadline = Math.floor(Date.now() / 1000) + 20000000

  await sushiRouter.addLiquidity(
    WETH,
    neuronToken.address,
    await wethContract.balanceOf(deployerAddress),
    await neuronToken.balanceOf(deployerAddress),
    0,
    0,
    deployerAddress,
    deadline,
  )

  await wethContract.deposit({ value: parseEther('1') })

  console.log('neuron balance before', formatEther(await neuronToken.balanceOf(deployerAddress)))

  await sushiRouter.swapExactTokensForTokens(
    await wethContract.balanceOf(deployerAddress),
    0,
    [WETH, neuronToken.address],
    deployerAddress,
    Math.floor(Date.now() / 1000) + 20000000
  )
  console.log('neuron balance after', formatEther(await neuronToken.balanceOf(deployerAddress)))

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


  await sushiGetLpToken({ signer: user, lpTokenAddress: lpAddress, ethAmount: parseEther('10') })

  const lpTokenContract = await getToken(lpAddress, user)

  const lpTokenBalanceInitial = await lpTokenContract.balanceOf(await user.getAddress())
  await lpTokenContract.approve(neuronPool.address, lpTokenBalanceInitial)

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
}