
import "@nomiclabs/hardhat-ethers"
import { ethers, network } from "hardhat"
import { ContractFactory, Signer, Wallet } from "ethers"
import { Controller, Controller__factory, ERC20, MasterChef__factory, NeuronPool__factory, NeuronToken__factory, StrategyBase, StrategyCurveRenCrv__factory, StrategyFeiTribeLp__factory, StrategyCurve3Crv__factory, StrategyCurveSteCrv__factory, Gauge__factory, GaugesDistributor__factory, Axon__factory, AxonVyper__factory, FeeDistributor, FeeDistributor__factory } from '../typechain'
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { getToken } from '../utils/getCurveTokens'

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
  const oneYearSeconds = 60 * 60 * 24 * 365
  const premintUnlockTime = Math.ceil(Date.now() / 1000) + oneYearSeconds

  await neuronToken.mint(deployerAddress, premint)

  await neuronToken.approve(axon.address, premint)
  await axon.create_lock(premint, premintUnlockTime, {
    gasLimit: 4000000
  })

  console.log('AXON TOTAL SUPPLY', formatEther(await axon['totalSupply()']()))

  // Time travel one week for distribution of rewards to gauges
  const oneWeekInSeconds = 60 * 60 * 24 * 7
  await network.provider.send('evm_increaseTime', [oneWeekInSeconds])
  await network.provider.send('evm_mine')

  const holder = deployerAddress

  console.log('HOLDER NEURON BALANCE, before all', formatEther(await neuronToken.balanceOf(holder)))
  console.log('HOLDER AXON BALANCE, before all', formatEther(await axon['balanceOf(address)'](holder)))

  await neuronToken.mint(feeDistributor.address, premint)
  await feeDistributor.checkpoint_token()
  console.log('FEEDISTRIBUTOR NEURON BALANCE', formatEther(await feeDistributor.token_last_balance()))

  const getHolderClaimable = async () => formatEther(await feeDistributor.callStatic['claim(address)'](holder))
  console.log('HOLDER CLAIMABLE, after deposit to distributor', await getHolderClaimable())

  await network.provider.send('evm_increaseTime', [oneWeekInSeconds])
  await network.provider.send('evm_mine')
  await feeDistributor.checkpoint_token()

  console.log('HOLDER CLAIMABLE, after week', await getHolderClaimable())

  await feeDistributor['claim()']()

  console.log('HOLDER NEURON BALANCE, after claim', formatEther(await neuronToken['balanceOf(address)'](holder)))
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
