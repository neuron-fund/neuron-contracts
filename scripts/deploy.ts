
import "@nomiclabs/hardhat-ethers"
import { ethers } from "hardhat"
import { ContractFactory, Signer, Wallet } from "ethers"
import { Controller, Controller__factory, ERC20, MasterChef__factory, NeuronPool__factory, NeuronToken__factory, StrategyBase, StrategyCurveRenCrv__factory, StrategyFeiTribeLp__factory, StrategyCurve3Crv__factory, StrategyCurveSteCrv__factory } from '../typechain'
import { writeFileSync } from 'node:fs'
import path from 'node:path'

const { formatEther, parseEther, parseUnits } = ethers.utils

async function main () {
  const accounts = await ethers.getSigners()
  const deployer = accounts[0]
  const devWallet = await Wallet.createRandom()
  const treasuryWallet = await Wallet.createRandom()

  const devAddress = devWallet.address
  const treasuryAddress = treasuryWallet.address
  const deployerAddress = await deployer.getAddress()
  const governanceAddress = devAddress
  const strategistAddress = deployerAddress
  const timelockAddress = deployerAddress

  // Contracts factories
  // Basic contracts
  const Controller = await ethers.getContractFactory('Controller', deployer) as Controller__factory
  const NeuronToken = await ethers.getContractFactory('NeuronToken', deployer) as NeuronToken__factory
  const Masterchef = await ethers.getContractFactory('MasterChef', deployer) as MasterChef__factory
  const NeuronPool = await ethers.getContractFactory('NeuronPool') as NeuronPool__factory
  // Strategies
  const Curve3Crv = await ethers.getContractFactory('StrategyCurve3Crv') as StrategyCurve3Crv__factory
  const CurveRenCrv = await ethers.getContractFactory('StrategyCurveRenCrv') as StrategyCurveRenCrv__factory
  const CurveSteCrv = await ethers.getContractFactory('StrategyCurveSteCrv') as StrategyCurveSteCrv__factory
  const FeiTribeLp = await ethers.getContractFactory('StrategyFeiTribeLp') as StrategyFeiTribeLp__factory

  const neuronToken = await NeuronToken.deploy()
  // TODO определиться со значниями следующих констант, важно для токеномики
  const neuronsPerBlock = parseEther('0.3')
  const startBlock = 0
  const bonusEndBlock = 0
  const masterChef = await Masterchef.deploy(neuronToken.address, devAddress, neuronsPerBlock, startBlock, bonusEndBlock)
  await neuronToken.transferOwnership(masterChef.address)

  const controller = await Controller.deploy(governanceAddress, strategistAddress, timelockAddress, devAddress, treasuryAddress)

  const deployStrategy = deployStrategyFactory({
    controller,
    neuronPoolFactory: NeuronPool,
    governanceAddress,
    strategistAddress,
    timelockAddress
  })

  const strategies = {
    Curve3Crv,
    CurveRenCrv,
    CurveSteCrv,
    FeiTribeLp
  }

  console.log(`NeuronToken address: ${neuronToken.address}`)
  console.log(`Controller address: ${controller.address}`)
  console.log(`MasterChef address: ${masterChef.address}`)

  const deployedStrategies = []
  for (const [strategyName, strategyFactory] of Object.entries(strategies)) {
    const { neuronPoolAddress, strategyAddress } = await deployStrategy(strategyFactory)
    console.log(`${strategyName}\n strategy address: ${strategyAddress} \n neuron pool address: ${neuronPoolAddress}\n\n`)
    const allocPoint = parseEther('10')
    await masterChef.add(allocPoint, neuronPoolAddress, false)
    deployedStrategies.push({ neuronPoolAddress, strategyAddress, strategyName })
  }

  await masterChef.massUpdatePools()

  writeFileSync(path.resolve(__dirname, '../frontend/constants.ts'), `
    export const NeuronTokenAddress = '${neuronToken.address}'
    export const ControllerAddress = '${controller.address}'
    export const MasterChefAddress = '${masterChef.address}'

    export const Pools = {
      ${deployedStrategies.map(({ neuronPoolAddress, strategyAddress, strategyName }, i) =>
    `
        ${strategyName}: {
          strategyAddress: '${strategyAddress}',
          poolAddress: '${neuronPoolAddress}',
          poolIndex: ${i}
        },

      `).join('')}
    }
  `)

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
  timelockAddress: string
}

function deployStrategyFactory ({
  controller,
  neuronPoolFactory,
  governanceAddress,
  strategistAddress,
  timelockAddress
}: DeployStrategyFactory) {
  return async <T extends ContractFactory> (strategyFactory: T): Promise<{
    strategyAddress: string,
    neuronPoolAddress: string,
  }> => {
    const strategy = await strategyFactory.deploy(
      governanceAddress,
      strategistAddress,
      controller.address,
      timelockAddress
    ) as StrategyBase
    const neuronPool = await neuronPoolFactory.deploy(
      await strategy.want(),
      governanceAddress,
      timelockAddress,
      controller.address
    )

    await controller.setNPool(await strategy.want(), neuronPool.address)
    await controller.approveStrategy(await strategy.want(), strategy.address)
    await controller.setStrategy(await strategy.want(), strategy.address)
    return {
      strategyAddress: strategy.address,
      neuronPoolAddress: neuronPool.address
    }
  }
}