import "@nomiclabs/hardhat-ethers"
import { ethers, network } from "hardhat"
import { ContractFactory, Wallet } from "ethers"
import { Controller, Controller__factory, MasterChef__factory, NeuronPool__factory, NeuronToken__factory, StrategyBase, StrategyCurveRenCrv__factory, StrategyFeiTribeLp__factory, StrategyCurve3Crv__factory, StrategyCurveSteCrv__factory, GaugesDistributor__factory, AxonVyper__factory, FeeDistributor__factory, StrategyAlcxSushiEthAlcxLp__factory } from '../typechain'
import { writeFileSync } from 'fs'
import path from 'path'
import { get3Crv, getToken } from '../utils/getCurveTokens'
import { waitNDays } from '../utils/time'
import { THREE_CRV } from '../constants/addresses'

const { formatEther, parseEther, parseUnits } = ethers.utils

async function main () {
  const accounts = await ethers.getSigners()
  const deployer = accounts[5]
  const devWallet = await Wallet.createRandom()
  const treasuryWallet = await Wallet.createRandom()

  const devAddress = devWallet.address
  const treasuryAddress = treasuryWallet.address
  const deployerAddress = await deployer.getAddress()
  const governanceAddress = deployerAddress
  const strategistAddress = deployerAddress
  const timelockAddress = deployerAddress
  const rewardsDistributor = treasuryAddress

  // Contracts factories
  // Basic contracts
  const Controller = await ethers.getContractFactory('Controller', deployer) as Controller__factory
  const NeuronToken = await ethers.getContractFactory('NeuronToken', deployer) as NeuronToken__factory
  const Masterchef = await ethers.getContractFactory('MasterChef', deployer) as MasterChef__factory
  const GaugesDistributor = await ethers.getContractFactory('GaugesDistributor', deployer) as GaugesDistributor__factory
  const NeuronPool = await ethers.getContractFactory('NeuronPool', deployer) as NeuronPool__factory

  // Strategies
  const Curve3Crv = await ethers.getContractFactory('StrategyCurve3Crv', deployer) as StrategyCurve3Crv__factory
  const CurveRenCrv = await ethers.getContractFactory('StrategyCurveRenCrv', deployer) as StrategyCurveRenCrv__factory
  const CurveSteCrv = await ethers.getContractFactory('StrategyCurveSteCrv', deployer) as StrategyCurveSteCrv__factory
  const FeiTribeLp = await ethers.getContractFactory('StrategyFeiTribeLp', deployer) as StrategyFeiTribeLp__factory
  const StrategyAlcxSushiEthAlcxLp = await ethers.getContractFactory('StrategyAlcxSushiEthAlcxLp', deployer) as StrategyAlcxSushiEthAlcxLp__factory

  const AxonVyper = await ethers.getContractFactory('AxonVyper', deployer) as AxonVyper__factory
  const FeeDistributor = await ethers.getContractFactory('FeeDistributor', deployer) as FeeDistributor__factory

  console.log('START DEPLOY')

  // TODO make AXON and fee-distributor changeable
  const neuronsPerBlock = parseEther('0.3')
  const startBlock = 0
  const bonusEndBlock = 0

  // TODO decide on timelock
  const neuronToken = await NeuronToken.deploy(governanceAddress)
  await neuronToken.deployed()
  const masterChef = await Masterchef.deploy(neuronToken.address, governanceAddress, devAddress, treasuryAddress, neuronsPerBlock, startBlock, bonusEndBlock)
  await masterChef.deployed()
  await neuronToken.setMinter(masterChef.address)
  await neuronToken.applyMinter()
  await neuronToken.setMinter(deployerAddress)
  await neuronToken.applyMinter()

  const axon = await AxonVyper.deploy(neuronToken.address, 'Axon token', 'AXON', '1.0')
  await axon.deployed()
  console.log('AXON DEPLOYED')

  const currentBlock = await network.provider.send("eth_getBlockByNumber", ["latest", true])
  const feeDistributor = await FeeDistributor.deploy(axon.address, currentBlock.timestamp, neuronToken.address, deployerAddress, deployerAddress)
  await feeDistributor.deployed()
  const gaugesDistributor = await GaugesDistributor.deploy(masterChef.address, neuronToken.address, axon.address, treasuryAddress, governanceAddress, governanceAddress)
  await gaugesDistributor.deployed()
  await masterChef.setDistributor(gaugesDistributor.address)


  const controller = await Controller.deploy(governanceAddress, strategistAddress, timelockAddress, devAddress, treasuryAddress)
  controller.deployed()
  const deployStrategy = deployStrategyFactory({
    controller,
    neuronPoolFactory: NeuronPool,
    governanceAddress,
    strategistAddress,
    masterChefAddress: masterChef.address,
    timelockAddress,
    gaugesDistributorAddress: gaugesDistributor.address
  })

  const strategies = {
    Curve3Crv,
    CurveRenCrv,
    CurveSteCrv,
    FeiTribeLp,
    StrategyAlcxSushiEthAlcxLp
  }

  console.log(`NeuronToken address: ${neuronToken.address}`)
  console.log(`Controller address: ${controller.address}`)
  console.log(`MasterChef address: ${masterChef.address}`)

  const deployedStrategies: DeployedStrategy[] = []
  for (const [strategyName, strategyFactory] of Object.entries(strategies)) {
    const { strategy, neuronPool } = await deployStrategy(strategyFactory)
    const neuronPoolAddress = neuronPool.address
    const strategyAddress = strategy.address
    const inputTokenAddress = await neuronPool.token()
    const inputToken = await getToken(inputTokenAddress, deployer)
    const inputTokenSymbol = await inputToken.symbol()
    console.log(`${strategyName}\n strategy address: ${strategyAddress} \n neuron pool address: ${neuronPoolAddress}\n\n`)
    await gaugesDistributor.addGauge(neuronPoolAddress)
    const gaugeAddress = await gaugesDistributor.getGauge(neuronPoolAddress)
    deployedStrategies.push({
      neuronPoolAddress,
      strategyAddress,
      strategyName,
      gaugeAddress,
      inputTokenSymbol,
      inputTokenAddress
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
    gasLimit: 4000000
  })

  await feeDistributor.toggle_allow_checkpoint_token()
  // Положили на счет feeDistributor нейроны и вызвали чекпойнт, чтобы он изменил свое состояние по их распределению
  await neuronToken.mint(feeDistributor.address, premint)
  await feeDistributor.checkpoint_token()

  await gaugesDistributor.vote(deployedStrategies.map(x => x.neuronPoolAddress), [25, 25, 25, 25])
  // Time travel one week for distribution of rewards to gauges
  await waitNDays(4, network.provider)
  await feeDistributor.checkpoint_total_supply({
    gasLimit: 12450000
  })

  await waitNDays(3, network.provider)

  await gaugesDistributor.distribute()

  writeFileSync(path.resolve(__dirname, '../frontend/constants.ts'), `
    export const NeuronTokenAddress = '${neuronToken.address}'
    export const ControllerAddress = '${controller.address}'
    export const MasterChefAddress = '${masterChef.address}'
    export const GaugeDistributorAddress = '${gaugesDistributor.address}'
    export const AxonAddress = '${axon.address}'
    export const FeeDistributorAddress = '${feeDistributor.address}'

    export const Pools = {
      ${deployedStrategies.map(({ neuronPoolAddress, strategyAddress, strategyName, inputTokenSymbol, inputTokenAddress, gaugeAddress }) =>
    `
        ${strategyName}: {
          strategyAddress: '${strategyAddress}',
          poolAddress: '${neuronPoolAddress}',
          gaugeAddress: '${gaugeAddress}',
          inputTokenAddress: '${inputTokenAddress}',
          inputTokenSymbol: '${inputTokenSymbol}',
        },

      `).join('')}
    }
  `)

  // Test pools one click deposit/withdraw
  const user = accounts[0]
  await get3Crv(user)
  const crv3StratInfo = deployedStrategies.find(x => x.strategyName === 'Curve3Crv')
  const crv3Pool = NeuronPool__factory.connect(crv3StratInfo.neuronPoolAddress, user)
  const threeCrv = await getToken(THREE_CRV, user)
  const getThreeCrvBalance = () => threeCrv.balanceOf(user.address)
  console.log('USER BALANCE BEFORE', formatEther(await getThreeCrvBalance()))

  await threeCrv.approve(crv3Pool.address, await getThreeCrvBalance())
  await crv3Pool.depositAndFarm(await getThreeCrvBalance())
  console.log('GAUGE BALANCE AFTER DEPOSIT', formatEther(await crv3Pool.balanceOf(crv3StratInfo.gaugeAddress)))
  await waitNDays(3, network.provider)
  console.log('USER BALANCE DEPOSITED', formatEther(await getThreeCrvBalance()))
  await crv3Pool.withdrawAllRightFromFarm()
  console.log('USER BALANCE AFTER', formatEther(await getThreeCrvBalance()))
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })

type DeployStrategyFactory = {
  controller: Controller,
  neuronPoolFactory: NeuronPool__factory,
  governanceAddress: string
  strategistAddress: string
  masterChefAddress: string
  timelockAddress: string
  gaugesDistributorAddress: string
}

type DeployedStrategy = {
  neuronPoolAddress: string
  strategyAddress: string
  strategyName: string
  gaugeAddress: string
  inputTokenSymbol: string
  inputTokenAddress: string
}

function deployStrategyFactory ({
  controller,
  neuronPoolFactory,
  governanceAddress,
  strategistAddress,
  masterChefAddress,
  timelockAddress,
  gaugesDistributorAddress
}: DeployStrategyFactory) {
  return async <T extends ContractFactory> (strategyFactory: T) => {
    const strategy = await strategyFactory.deploy(
      governanceAddress,
      strategistAddress,
      controller.address,
      timelockAddress
    ) as StrategyBase
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
      neuronPool
    }
  }
}
