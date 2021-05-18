
import "@nomiclabs/hardhat-ethers"
import { ethers, network } from "hardhat"
import { Signer } from "ethers"
import { Controller__factory, ICurveFi, IERC20, IStEth, NeuronPool__factory, StrategyCurveSteCrv__factory } from '../typechain'
import { assert } from 'chai'
import { CURVE_STE_CRV_POOL, LIDO_ST_ETH, STE_CRV } from '../constants/addresses'
import { getSteCrv, getToken } from '../utils/getCurveTokens'

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

    const Strategy = await ethers.getContractFactory('StrategyCurveSteCrv') as StrategyCurveSteCrv__factory
    const strategy = await Strategy.deploy(
      await governance.getAddress(),
      await strategist.getAddress(),
      controller.address,
      await timelock.getAddress()
    )

    console.log('Assert strategy wants correct token')
    assert(await strategy.want() === STE_CRV)

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

    await getSteCrv(user)


    const steCrv = await getToken(STE_CRV, user)
    const steCrvUserBalanceInitial = await steCrv.balanceOf(await user.getAddress())
    console.log(`steCrvUserBalanceInitial`, ethers.utils.formatEther(steCrvUserBalanceInitial))
    await steCrv.connect(user).approve(neuronPool.address, steCrvUserBalanceInitial)

    console.log('Connect user to pool')
    const neuronPoolUserConnected = await neuronPool.connect(user)
    console.log('Depositing to pool')
    await neuronPoolUserConnected.deposit(steCrvUserBalanceInitial)
    console.log('Execute pools earn function')
    await neuronPool.earn()

    console.log('Time travel one week later')
    const oneWeekInSeconds = 60 * 60 * 24 * 7
    await network.provider.send('evm_increaseTime', [oneWeekInSeconds])
    await network.provider.send('evm_mine')

    console.log('Strategy harvest')
    await strategy.harvest()

    // Withdraws back to pickleJar
    const inPoolBefore = await steCrv.balanceOf(neuronPool.address)
    console.log(`inPoolBefore`, ethers.utils.formatEther(inPoolBefore))
    console.log('Withdraw all from controller')
    await controller.withdrawAll(steCrv.address)
    const inPoolAfter = await steCrv.balanceOf(neuronPool.address)
    console.log(`inPoolAfter`, ethers.utils.formatEther(inPoolAfter))

    assert(inPoolAfter.gt(inPoolBefore), 'Unsuccesfull withdraw from strategy to pool')

    const steCrvUserBalanceBefore = await steCrv.balanceOf(await user.getAddress())
    console.log(`steCrvUserBalanceBefore`, ethers.utils.formatEther(steCrvUserBalanceBefore))
    console.log('Widthdraw from pool to user')
    await neuronPoolUserConnected.withdrawAll()
    const steCrvUserBalanceAfter = await steCrv.balanceOf(await user.getAddress())
    console.log(`steCrvUserBalanceAfter`, ethers.utils.formatEther(steCrvUserBalanceAfter))

    assert(steCrvUserBalanceAfter.gt(steCrvUserBalanceBefore), 'Unsuccesfull withdraw from pool to user')

    // Gained some interest
    assert(steCrvUserBalanceAfter.gt(steCrvUserBalanceInitial), 'User have not got any interest after deposit')
  })

  it('should do something right', async function () {
    // const box = await Box.attach(address)
  })
})