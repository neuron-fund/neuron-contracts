import '@nomiclabs/hardhat-ethers'
import { ethers, network } from 'hardhat'
import { ContractFactory, Wallet } from 'ethers'
import {
  Controller,
  Controller__factory,
  MasterChef__factory,
  NeuronPool__factory,
  NeuronToken__factory,
  StrategyBase,
  StrategyCurveRenCrv__factory,
  StrategyFeiTribeLp__factory,
  StrategyCurve3Crv__factory,
  StrategyCurveSteCrv__factory,
  GaugesDistributor__factory,
  AxonVyper__factory,
  FeeDistributor__factory,
  StrategySushiDoubleEthAlcxLp__factory,
  StrategySushiDoubleEthCvxLp__factory,
  StrategySushiDoubleEthPickleLp__factory,
  StrategySushiDoubleEthRulerLp__factory,
  StrategySushiEthDaiLp__factory,
  StrategySushiEthSushiLp__factory,
  StrategySushiEthUsdcLp__factory,
  StrategySushiEthWbtcLp__factory,
  StrategyYearnAffiliate__factory,
  StrategyYearnCrvFrax__factory,
  StrategyYearnCrvLusd__factory,
  StrategyYearnCrvSteth__factory,
  StrategyYearnUsdcV2__factory,
} from '../typechain'
import { getToken } from '../utils/getCurveTokens'
import { waitNDays } from '../utils/time'

const { formatEther, parseEther, parseUnits } = ethers.utils

export async function deploy() {
  const accounts = await ethers.getSigners()
  const deployer = accounts[5]
  const devWallet = await Wallet.createRandom()
  const treasuryWallet = await Wallet.createRandom()
  const masterChefTreasureWallet = await Wallet.createRandom()

  const devAddress = devWallet.address
  const treasuryAddress = treasuryWallet.address
  const masterChefTreasureAddress = masterChefTreasureWallet.address
  const deployerAddress = await deployer.getAddress()
  const governanceAddress = deployerAddress
  const strategistAddress = deployerAddress
  const timelockAddress = deployerAddress
  const rewardsDistributor = treasuryAddress

  // Contracts factories
  // Basic contracts
  const Controller = (await ethers.getContractFactory('Controller', deployer)) as Controller__factory
  const NeuronToken = (await ethers.getContractFactory('NeuronToken', deployer)) as NeuronToken__factory
  const Masterchef = (await ethers.getContractFactory('MasterChef', deployer)) as MasterChef__factory
  const GaugesDistributor = (await ethers.getContractFactory(
    'GaugesDistributor',
    deployer
  )) as GaugesDistributor__factory
  const NeuronPool = (await ethers.getContractFactory('NeuronPool', deployer)) as NeuronPool__factory

  // Strategies
  const StrategyCurve3Crv = (await ethers.getContractFactory(
    'StrategyCurve3Crv',
    deployer
  )) as StrategyCurve3Crv__factory
  const StrategyCurveRenCrv = (await ethers.getContractFactory(
    'StrategyCurveRenCrv',
    deployer
  )) as StrategyCurveRenCrv__factory
  const StrategyCurveSteCrv = (await ethers.getContractFactory(
    'StrategyCurveSteCrv',
    deployer
  )) as StrategyCurveSteCrv__factory
  const StrategyFeiTribeLp = (await ethers.getContractFactory(
    'StrategyFeiTribeLp',
    deployer
  )) as StrategyFeiTribeLp__factory
  const StrategySushiDoubleEthAlcxLp = (await ethers.getContractFactory(
    'StrategySushiDoubleEthAlcxLp',
    deployer
  )) as StrategySushiDoubleEthAlcxLp__factory
  const StrategySushiDoubleEthCvxLp = (await ethers.getContractFactory(
    'StrategySushiDoubleEthCvxLp',
    deployer
  )) as StrategySushiDoubleEthCvxLp__factory
  const StrategySushiDoubleEthPickleLp = (await ethers.getContractFactory(
    'StrategySushiDoubleEthPickleLp',
    deployer
  )) as StrategySushiDoubleEthPickleLp__factory
  const StrategySushiDoubleEthRulerLp = (await ethers.getContractFactory(
    'StrategySushiDoubleEthRulerLp',
    deployer
  )) as StrategySushiDoubleEthRulerLp__factory
  const StrategySushiEthDaiLp = (await ethers.getContractFactory(
    'StrategySushiEthDaiLp',
    deployer
  )) as StrategySushiEthDaiLp__factory
  const StrategySushiEthSushiLp = (await ethers.getContractFactory(
    'StrategySushiEthSushiLp',
    deployer
  )) as StrategySushiEthSushiLp__factory
  const StrategySushiEthUsdcLp = (await ethers.getContractFactory(
    'StrategySushiEthUsdcLp',
    deployer
  )) as StrategySushiEthUsdcLp__factory
  const StrategySushiEthWbtcLp = (await ethers.getContractFactory(
    'StrategySushiEthWbtcLp',
    deployer
  )) as StrategySushiEthWbtcLp__factory
  const StrategyYearnCrvFrax = (await ethers.getContractFactory(
    'StrategyYearnCrvFrax',
    deployer
  )) as StrategyYearnCrvFrax__factory
  const StrategyYearnCrvLusd = (await ethers.getContractFactory(
    'StrategyYearnCrvLusd',
    deployer
  )) as StrategyYearnCrvLusd__factory
  const StrategyYearnCrvSteth = (await ethers.getContractFactory(
    'StrategyYearnCrvSteth',
    deployer
  )) as StrategyYearnCrvSteth__factory
  const StrategyYearnUsdcV2 = (await ethers.getContractFactory(
    'StrategyYearnUsdcV2',
    deployer
  )) as StrategyYearnUsdcV2__factory

  const AxonVyper = (await ethers.getContractFactory('AxonVyper', deployer)) as AxonVyper__factory
  const FeeDistributor = (await ethers.getContractFactory('FeeDistributor', deployer)) as FeeDistributor__factory

  console.log('START DEPLOY')

  const neuronsPerBlock = parseEther('0.3')
  const startBlock = 0
  const bonusEndBlock = 0

  const neuronToken = await NeuronToken.deploy(governanceAddress)
  await neuronToken.deployed()
  const masterChef = await Masterchef.deploy(
    neuronToken.address,
    governanceAddress,
    devAddress,
    masterChefTreasureAddress,
    neuronsPerBlock,
    startBlock,
    bonusEndBlock
  )
  await masterChef.deployed()
  await neuronToken.setMinter(masterChef.address)
  await neuronToken.applyMinter()
  await neuronToken.setMinter(deployerAddress)
  await neuronToken.applyMinter()

  const axon = await AxonVyper.deploy(neuronToken.address, 'veNEUR token', 'veNEUR', '1.0')
  await axon.deployed()
  console.log('AXON DEPLOYED')

  const currentBlock = await network.provider.send('eth_getBlockByNumber', ['latest', true])
  const feeDistributor = await FeeDistributor.deploy(
    axon.address,
    currentBlock.timestamp,
    neuronToken.address,
    deployerAddress,
    deployerAddress
  )
  await feeDistributor.deployed()
  const gaugesDistributor = await GaugesDistributor.deploy(
    masterChef.address,
    neuronToken.address,
    axon.address,
    treasuryAddress,
    governanceAddress,
    governanceAddress
  )
  await gaugesDistributor.deployed()
  await masterChef.setDistributor(gaugesDistributor.address)

  const controller = await Controller.deploy(
    governanceAddress,
    strategistAddress,
    timelockAddress,
    devAddress,
    treasuryAddress
  )
  controller.deployed()
  const deployStrategy = deployStrategyFactory({
    controller,
    neuronPoolFactory: NeuronPool,
    governanceAddress,
    strategistAddress,
    masterChefAddress: masterChef.address,
    timelockAddress,
    gaugesDistributorAddress: gaugesDistributor.address,
    neuronTokenAddress: neuronToken.address,
  })

  const strategies = [
    { name: 'Curve3Crv', factory: StrategyCurve3Crv },
    { name: 'CurveRenCrv', factory: StrategyCurveRenCrv },
    { name: 'CurveSteCrv', factory: StrategyCurveSteCrv },
    { name: 'FeiTribeLp', factory: StrategyFeiTribeLp },
    { name: 'SushiDoubleEthAlcxLp', factory: StrategySushiDoubleEthAlcxLp },
    { name: 'SushiDoubleEthCvxLp', factory: StrategySushiDoubleEthCvxLp },
    { name: 'SushiDoubleEthPickleLp', factory: StrategySushiDoubleEthPickleLp },
    { name: 'SushiDoubleEthRulerLp', factory: StrategySushiDoubleEthRulerLp },
    { name: 'SushiEthDaiLp', factory: StrategySushiEthDaiLp },
    { name: 'SushiEthSushiLp', factory: StrategySushiEthSushiLp },
    { name: 'SushiEthUsdcLp', factory: StrategySushiEthUsdcLp },
    { name: 'SushiEthWbtcLp', factory: StrategySushiEthWbtcLp },
    // { name: 'YearnCrvFrax', factory: StrategyYearnCrvFrax, noNeuronTokenInConstructor: true },
    // { name: 'YearnCrvLusd', factory: StrategyYearnCrvLusd, noNeuronTokenInConstructor: true },
    // { name: 'YearnCrvSteth', factory: StrategyYearnCrvSteth, noNeuronTokenInConstructor: true },
    // { name: 'YearnUsdcV2', factory: StrategyYearnUsdcV2, noNeuronTokenInConstructor: true },
  ]

  console.log(`NeuronToken address: ${neuronToken.address}`)
  console.log(`Controller address: ${controller.address}`)
  console.log(`MasterChef address: ${masterChef.address}`)

  const deployedStrategies: DeployedStrategy[] = []
  for (const strategyInfo of strategies) {
    const { strategy, neuronPool } = await deployStrategy(strategyInfo.factory, false)
    const neuronPoolAddress = neuronPool.address
    const strategyAddress = strategy.address
    const inputTokenAddress = await neuronPool.token()
    const inputToken = await getToken(inputTokenAddress, deployer)
    const inputTokenSymbol = await inputToken.symbol()
    console.log(
      `${strategyInfo.name}\n strategy address: ${strategyAddress} \n neuron pool address: ${neuronPoolAddress}\n\n`
    )
    await gaugesDistributor.addGauge(neuronPoolAddress)
    const gaugeAddress = await gaugesDistributor.getGauge(neuronPoolAddress)
    deployedStrategies.push({
      neuronPoolAddress,
      strategyAddress,
      strategyName: strategyInfo.name,
      gaugeAddress,
      inputTokenSymbol,
      inputTokenAddress,
    })
  }

  const premint = parseEther('100')
  const oneYearSeconds = 60 * 60 * 24 * 365
  const premintUnlockTime = Math.ceil(Date.now() / 1000) + oneYearSeconds

  await neuronToken.mint(deployerAddress, premint)
  // Mint to test account
  await neuronToken.mint(accounts[0].address, premint)

  await neuronToken.approve(axon.address, premint)
  await axon.create_lock(premint, premintUnlockTime, {
    gasLimit: 4000000,
  })

  await feeDistributor.toggle_allow_checkpoint_token()
  // Положили на счет feeDistributor нейроны и вызвали чекпойнт, чтобы он изменил свое состояние по их распределению
  await neuronToken.mint(feeDistributor.address, premint)
  await feeDistributor.checkpoint_token()

  const numberOfStrategies = strategies.length
  const weights = [...new Array(numberOfStrategies)].map(x => 100 / numberOfStrategies).map(Math.floor)

  await gaugesDistributor.setWeights(
    deployedStrategies.map(x => x.neuronPoolAddress),
    weights
  )
  // Time travel one week for distribution of rewards to gauges
  // await waitNDays(4, network.provider)
  // await feeDistributor.checkpoint_total_supply({
  //   gasLimit: 12450000
  // })

  // await waitNDays(3, network.provider)

  // await gaugesDistributor.distribute()

  return {
    neuronTokenAddress: neuronToken.address,
    controllerAddress: controller.address,
    masterChefAddress: masterChef.address,
    gaugesDistributorAddress: gaugesDistributor.address,
    axonAddress: axon.address,
    feeDistributorAddress: feeDistributor.address,
    deployedStrategies,
  }
}

type DeployStrategyFactory = {
  controller: Controller
  neuronPoolFactory: NeuronPool__factory
  governanceAddress: string
  strategistAddress: string
  masterChefAddress: string
  timelockAddress: string
  gaugesDistributorAddress: string
  neuronTokenAddress: string
}

type DeployedStrategy = {
  neuronPoolAddress: string
  strategyAddress: string
  strategyName: string
  gaugeAddress: string
  inputTokenSymbol: string
  inputTokenAddress: string
}

function deployStrategyFactory({
  controller,
  neuronPoolFactory,
  governanceAddress,
  strategistAddress,
  masterChefAddress,
  timelockAddress,
  gaugesDistributorAddress,
  neuronTokenAddress,
}: DeployStrategyFactory) {
  return async <T extends ContractFactory>(strategyFactory: T, notPassNeuronToken?: boolean) => {
    const strategy = notPassNeuronToken
      ? ((await strategyFactory.deploy(
          governanceAddress,
          strategistAddress,
          controller.address,
          timelockAddress
        )) as StrategyBase)
      : ((await strategyFactory.deploy(
          governanceAddress,
          strategistAddress,
          controller.address,
          neuronTokenAddress,
          timelockAddress
        )) as StrategyBase)
    await strategy.deployed()
    const neuronPool = await neuronPoolFactory.deploy(
      await strategy.want(),
      governanceAddress,
      timelockAddress,
      controller.address,
      masterChefAddress,
      gaugesDistributorAddress
    )
    await neuronPool.deployed()

    await controller.setNPool(await strategy.want(), neuronPool.address)
    await controller.approveStrategy(await strategy.want(), strategy.address)
    await controller.setStrategy(await strategy.want(), strategy.address)
    return {
      strategy,
      neuronPool,
    }
  }
}
