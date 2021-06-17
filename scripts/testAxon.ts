
import "@nomiclabs/hardhat-ethers"
import { ethers, network } from "hardhat"
import { ContractFactory, Signer, Wallet } from "ethers"
import { Controller, Controller__factory, ERC20, MasterChef__factory, NeuronPool__factory, NeuronToken__factory, StrategyBase, StrategyCurveRenCrv__factory, StrategyFeiTribeLp__factory, StrategyCurve3Crv__factory, StrategyCurveSteCrv__factory, Gauge__factory, GaugesDistributor__factory, Axon__factory, AxonVyper__factory, FeeDistributor, FeeDistributor__factory } from '../typechain'
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { getToken } from '../utils/getCurveTokens'
import { DAY, waitWeek } from '../utils/time'

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

  const axon = await AxonVyper.deploy(neuronToken.address, 'Axon token', 'AXON', '1.0')
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

  console.log('AXON TOTAL SUPPLY', formatEther(await axon['totalSupply()']()))

  await neuronToken.mint(feeDistributor.address, premint)
  await feeDistributor.checkpoint_token()

  await waitWeek(network.provider)
  // await neuronToken.mint(feeDistributor.address, premint)
  // await feeDistributor.checkpoint_token()
  
  await feeDistributor['claim()']()
  await waitWeek(network.provider)
  
  // console.log('HOLDER NEURON BALANCE, after claim', formatEther(await neuronToken['balanceOf(address)'](holder)))

  // await neuronToken.mint(feeDistributor.address, premint)
  // await feeDistributor.checkpoint_token()


  const testAcc = accounts[0]
  const testAccNeur = await neuronToken.connect(testAcc)
  await neuronToken.mint(testAcc.address, premint)
  await testAccNeur.approve(axon.address, premint)
  const testAccAxon = await axon.connect(testAcc)
  await testAccAxon.create_lock(
    parseEther('100'), Math.ceil((Date.now() / 1000 + oneYearSeconds / 12)), {
      gasLimit: 12450000
    })
  console.log('AXON TOTAL SUPPLY', formatEther(await axon['totalSupply()']()))
  console.log('TEST ACC AXON balance', formatEther(await axon['balanceOf(address)'](testAcc.address)))
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
