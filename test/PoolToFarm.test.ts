
import "@nomiclabs/hardhat-ethers"
import { ethers, network } from "hardhat"
import { BigNumber, Signer } from "ethers"
import { IUniswapRouterV2 } from '../typechain/IUniswapRouterV2'
import { Controller__factory, ICurveFi3, IERC20, MasterChef__factory, NeuronPool__factory, NeuronToken__factory, StrategyCurve3Crv, StrategyCurve3Crv__factory } from '../typechain'
import { assert } from 'chai'
import { THREE_CRV } from '../constants/addresses'
import { get3Crv, getToken } from '../utils/getCurveTokens'
import { parseEther } from 'ethers/lib/utils'

describe('Token', function () {
  let accounts: Signer[]

  beforeEach(async function () {
    accounts = await ethers.getSigners()


    const deployer = accounts[0]
    const governance = deployer
    const strategist = deployer
    const timelock = deployer
    const devfund = accounts[1]
    const treasury = accounts[2]
    const user = accounts[3]

    const Controller = await ethers.getContractFactory('Controller') as Controller__factory

    const controller = await Controller.deploy(
      await governance.getAddress(),
      await strategist.getAddress(),
      await timelock.getAddress(),
      await devfund.getAddress(),
      await treasury.getAddress()
    )

    const Strategy = await ethers.getContractFactory('StrategyCurve3Crv') as StrategyCurve3Crv__factory
    const strategy = await Strategy.deploy(
      await governance.getAddress(),
      await strategist.getAddress(),
      controller.address,
      await timelock.getAddress()
    )

    assert(await strategy.want() === THREE_CRV)
    const Masterchef = await ethers.getContractFactory('MasterChef', deployer) as MasterChef__factory
    const NeuronToken = await ethers.getContractFactory('NeuronToken', deployer) as NeuronToken__factory
    const neuronToken = await NeuronToken.deploy()
    const neuronsPerBlock = parseEther('0.3')
    const startBlock = 0
    const bonusEndBlock = 0
    const masterChef = await Masterchef.deploy(neuronToken.address, await devfund.getAddress(), neuronsPerBlock, startBlock, bonusEndBlock)
    await neuronToken.transferOwnership(masterChef.address)
    const NeuronPool = await ethers.getContractFactory('NeuronPool') as NeuronPool__factory
    const neuronPool = await NeuronPool.deploy(
      await strategy.want(),
      await governance.getAddress(),
      await timelock.getAddress(),
      controller.address,
      masterChef.address,
    )



    await controller.setNPool(await strategy.want(), neuronPool.address)
    await controller.approveStrategy(await strategy.want(), strategy.address)
    await controller.setStrategy(await strategy.want(), strategy.address)
    const allocPoint = parseEther('10')
    await masterChef.add(allocPoint, neuronPool.address, false)
    await masterChef.massUpdatePools()
    await get3Crv(user)

    const threeCrv = await getToken(THREE_CRV, user)
    const threeCrvUserBalanceInitial = await threeCrv.balanceOf(await user.getAddress())
    await threeCrv.connect(user).approve(neuronPool.address, threeCrvUserBalanceInitial)

    const neuronPoolUserConnected = await neuronPool.connect(user)
    await neuronPoolUserConnected.depositAndFarm(threeCrvUserBalanceInitial, 0)
  })

  it('should do something right', async function () {
    // const box = await Box.attach(address)
  })
})