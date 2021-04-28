
import "@nomiclabs/hardhat-ethers"
import { ethers, network } from "hardhat"
import { Signer } from "ethers"
import { IUniswapRouterV2 } from '../typechain/IUniswapRouterV2'
import { Controller__factory, ICurveFi3, IERC20, NeuronPool, NeuronPool__factory, StrategyCurve3CRVv2__factory } from '../typechain'
import { assert } from 'chai'

const UniswapRouterV2Address = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'
const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F'
const ETH = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
const THREE_CRV = '0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490'

const CURVE_3CRV_POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7'


const getToken = async (address: string, signer: Signer) => {
  return (await ethers.getContractAt('IERC20', address, signer)) as IERC20
}

describe('Token', function () {
  let accounts: Signer[]

  beforeEach(async function () {
    accounts = await ethers.getSigners()

    const get3Crv = async (recipient: Signer) => {
      const accAddress = await recipient.getAddress()
      const dai = await getToken(DAI, recipient)
      const ethBalanceBefore = ethers.utils.formatEther(await recipient.getBalance())
      const daiBalanceBefore = ethers.utils.formatEther(await dai.balanceOf(accAddress))
      console.log(`ethBalanceBefore`, ethBalanceBefore)
      console.log(`daiBalanceBefore`, daiBalanceBefore)

      const uniswapRouter = await ethers.getContractAt('IUniswapRouterV2', UniswapRouterV2Address, recipient) as IUniswapRouterV2

      await uniswapRouter.swapExactETHForTokens(
        '0',
        [WETH, DAI],
        await recipient.getAddress(),
        Date.now() + 30000,
        {
          gasLimit: 4000000,
          value: ethers.utils.parseEther("5"),
        },
      )

      const ethBalanceAfter = ethers.utils.formatEther((await recipient.getBalance()))
      const daiBalanceAfter = await dai.balanceOf(accAddress)
      console.log(`ethBalanceAfter`, ethBalanceAfter)
      console.log(`daiBalanceAfter`, ethers.utils.formatEther(daiBalanceAfter))
      const curve3CrvPool = await ethers.getContractAt('ICurveFi_3', CURVE_3CRV_POOL, recipient) as ICurveFi3
      await dai.connect(recipient).approve(curve3CrvPool.address, daiBalanceAfter)
      await curve3CrvPool.add_liquidity([daiBalanceAfter, 0, 0], 0)
      const threeCrv = await getToken(THREE_CRV, recipient)
      const threeCrvBalance = await threeCrv.balanceOf(accAddress)
      console.log(`threeCrvBalance`, ethers.utils.formatEther(threeCrvBalance))
    }

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

    const Strategy = await ethers.getContractFactory('StrategyCurve3CRVv2') as StrategyCurve3CRVv2__factory
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

    // Withdraws back to pickleJar
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