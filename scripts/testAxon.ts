
import "@nomiclabs/hardhat-ethers"
import { ethers, network } from "hardhat"
import { ContractFactory, Signer, Wallet } from "ethers"
import { Controller, Controller__factory, ERC20, MasterChef__factory, NeuronPool__factory, NeuronToken__factory, StrategyBase, StrategyCurveRenCrv__factory, StrategyFeiTribeLp__factory, StrategyCurve3Crv__factory, StrategyCurveSteCrv__factory, Gauge__factory, GaugesDistributor__factory, Axon__factory, AxonVyper__factory, FeeDistributor, FeeDistributor__factory } from '../typechain'
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { getToken } from '../utils/getCurveTokens'
import { DAY, waitNDays, waitWeek } from '../utils/time'

const { formatEther, parseEther, parseUnits } = ethers.utils

async function main () {
  // TEST REWARDS DISTRIBUTION FOR AXON HOLDERS

  const accounts = await ethers.getSigners()
  const deployer = accounts[5]

  const deployerAddress = await deployer.getAddress()
  const governanceAddress = deployerAddress

  const NeuronToken = await ethers.getContractFactory('NeuronToken', deployer) as NeuronToken__factory
  const AxonVyper = await ethers.getContractFactory('AxonVyper', deployer) as AxonVyper__factory
  const FeeDistributor = await ethers.getContractFactory('FeeDistributor', deployer) as FeeDistributor__factory


  const neuronToken = await NeuronToken.deploy(governanceAddress)
  await neuronToken.deployed()

  const axon = await AxonVyper.deploy(neuronToken.address, 'veNEUR token', 'veNEUR', '1.0')
  await axon.deployed()

  const currentBlock = await network.provider.send("eth_getBlockByNumber", ["latest", true])
  const feeDistributor = await FeeDistributor.deploy(axon.address, currentBlock.timestamp, neuronToken.address, deployerAddress, deployerAddress)
  await feeDistributor.deployed()


  await neuronToken.addMinter(deployerAddress)


  const premint = parseEther('100')
  const oneYearSeconds = DAY * 365
  const premintUnlockTime = Math.ceil(Date.now() / 1000) + oneYearSeconds

  await neuronToken.mint(deployerAddress, premint)
  await neuronToken.approve(axon.address, premint)
  await axon.create_lock(premint, premintUnlockTime, {
    gasLimit: 4000000
  })

  await feeDistributor.toggle_allow_checkpoint_token()
  await neuronToken.mint(feeDistributor.address, premint)
  // TODO это нужно вызывать после распределения награды
  await feeDistributor.checkpoint_token()

  await waitNDays(4, network.provider)
  // await neuronToken.mint(feeDistributor.address, premint)

  // await feeDistributor['claim()']()
  // TODO важно вызывать эту функцию раз в неделю, если никто не вызывал claim. В feeDistributor хранится инфа о кол-ве аксонов и эта функция ее вычисляет
  await feeDistributor.checkpoint_total_supply()

  // await waitWeek(network.provider)

  await waitNDays(2, network.provider)

  const testAcc = accounts[0]
  const testAccNeur = await neuronToken.connect(testAcc)
  await neuronToken.mint(testAcc.address, premint)
  await testAccNeur.approve(axon.address, premint)
  const testAccAxon = await axon.connect(testAcc)
  await testAccAxon.create_lock(
    parseEther('10'),
    Math.ceil((Date.now() / 1000 + DAY * 15)), {
    gasLimit: 12450000
  })
  await feeDistributor.callStatic["claim(address)"](testAcc.address)
  console.log('AXON TOTAL SUPPLY', formatEther(await axon['totalSupply()']()))
  console.log('TEST ACC AXON balance', formatEther(await axon['balanceOf(address)'](testAcc.address)))
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })

