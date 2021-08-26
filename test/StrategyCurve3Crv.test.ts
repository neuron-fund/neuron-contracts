
import "@nomiclabs/hardhat-ethers"
import { ethers, network } from "hardhat"
import { Signer } from "ethers"
import { IUniswapRouterV2 } from '../typechain/IUniswapRouterV2'
import { Controller__factory, ICurveFi3, IERC20, NeuronPool__factory, StrategyCurve3Crv, StrategyCurve3Crv__factory } from '../typechain'
import { assert } from 'chai'
import { THREE_CRV } from '../constants/addresses'
import { get3Crv, getToken } from '../utils/getCurveTokens'

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

    console.log('Assert strategy wants correct token')
    assert(await strategy.want() === THREE_CRV)

    const NeuronPool = await ethers.getContractFactory('NeuronPool') as NeuronPool__factory
    const neuronPool = await NeuronPool.deploy(
      await strategy.want(),
      await governance.getAddress(),
      await timelock.getAddress(),
      controller.address
    )

    await controller.setNPool(await strategy.want(), neuronPool.address)
    await controller.approveStrategy(await strategy.want(), strategy.address)
    await controller.setStrategy(await strategy.want(), strategy.address)

    await get3Crv(user)

    const threeCrv = await getToken(THREE_CRV, user)
    const threeCrvUserBalanceInitial = await threeCrv.balanceOf(await user.getAddress())
    console.log(`threeCrvUserBalanceInitial`, ethers.utils.formatEther(threeCrvUserBalanceInitial))
    await threeCrv.connect(user).approve(neuronPool.address, threeCrvUserBalanceInitial)

    console.log('Connect user to pool')
    const neuronPoolUserConnected = await neuronPool.connect(user)
    console.log('Depositing to pool')
    await neuronPoolUserConnected.deposit(threeCrvUserBalanceInitial)
    console.log('Execute pools earn function')
    await neuronPool.earn()

    console.log('Time travel one week later')
    const oneWeekInSeconds = 60 * 60 * 24 * 7
    await network.provider.send('evm_increaseTime', [oneWeekInSeconds])
    await network.provider.send('evm_mine')

    console.log('Strategy harvest')
    await strategy.harvest()

    // Withdraws back to neuron pool
    const inPoolBefore = await threeCrv.balanceOf(neuronPool.address)
    console.log(`inPoolBefore`, ethers.utils.formatEther(inPoolBefore))
    console.log('Withdraw all from controller')
    await controller.withdrawAll(threeCrv.address)
    const inPoolAfter = await threeCrv.balanceOf(neuronPool.address)
    console.log(`inPoolAfter`, ethers.utils.formatEther(inPoolAfter))

    assert(inPoolAfter.gt(inPoolBefore), 'Unsuccesfull withdraw from strategy to pool')

    const threeCrvUserBalanceBefore = await threeCrv.balanceOf(await user.getAddress())
    console.log(`threeCrvUserBalanceBefore`, ethers.utils.formatEther(threeCrvUserBalanceBefore))
    console.log('Widthdraw from pool to user')
    await neuronPoolUserConnected.withdrawAll()
    const threeCrvUserBalanceAfter = await threeCrv.balanceOf(await user.getAddress())
    console.log(`threeCrvUserBalanceAfter`, ethers.utils.formatEther(threeCrvUserBalanceAfter))

    assert(threeCrvUserBalanceAfter.gt(threeCrvUserBalanceBefore), 'Unsuccesfull withdraw from pool to user')

    // Gained some interest
    assert(threeCrvUserBalanceAfter.gt(threeCrvUserBalanceInitial), 'User have not got any interest after deposit')
  })

  it('should do something right', async function () {
    // const box = await Box.attach(address)
  })
})