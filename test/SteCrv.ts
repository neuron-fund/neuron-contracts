
import "@nomiclabs/hardhat-ethers"
import { ethers, network } from "hardhat"
import { Signer } from "ethers"
import { IUniswapRouterV2 } from '../typechain/IUniswapRouterV2'
import { Controller__factory, ICurveFi, ICurveFi3, IERC20, IStEth, NeuronPool, NeuronPool__factory, StrategyCurveSteCRV__factory } from '../typechain'
import { assert } from 'chai'

const UniswapRouterV2Address = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'
const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F'
const ETH = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
const THREE_CRV = '0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490'
const STE_CRV = '0x06325440D014e39736583c165C2963BA99fAf14E'

const CURVE_3CRV_POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7'
// This contract works both as pool and token itself. 
// Also this contract is Proxy contract. It's implementation is on '0x20dc62d5904633cc6a5e34bec87a048e80c92e97' address currently
const LIDO_ST_ETH = '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84'
const CURVE_STE_CRV_POOL = '0xDC24316b9AE028F1497c275EB9192a3Ea0f67022'

const getToken = async (address: string, signer: Signer) => {
  return (await ethers.getContractAt('IERC20', address, signer)) as IERC20
}

describe('Token', function () {
  let accounts: Signer[]

  beforeEach(async function () {
    accounts = await ethers.getSigners()

    const getSteCrv = async (recipient: Signer) => {
      const accAddress = await recipient.getAddress()

      const lidoStEth = await ethers.getContractAt('IStEth', LIDO_ST_ETH, recipient) as IStEth
      const ethBalanceBefore = ethers.utils.formatEther(await recipient.getBalance())
      console.log(`ethBalanceBefore`, ethBalanceBefore)
      console.log('stEth balance Before', ethers.utils.formatEther(await lidoStEth.balanceOf(accAddress)))
      console.log('Deposit ETH into lido stEth pool to get StEth token')
      await lidoStEth.submit(accAddress, { value: ethers.utils.parseEther('100') })

      const ethBalanceAfter = ethers.utils.formatEther(await recipient.getBalance())
      const stEthBalanceAfter = await lidoStEth.balanceOf(accAddress)
      console.log(`ethBalanceAfter`, ethBalanceAfter)
      console.log('stEth balance after', ethers.utils.formatEther(stEthBalanceAfter))

      console.log('Getting curve ste crv pool contract')
      const curveSteCrvPool = await ethers.getContractAt('ICurveFi', CURVE_STE_CRV_POOL, recipient) as ICurveFi
      console.log('Approve sending steCrv from user to curve pool')
      await lidoStEth.connect(recipient).approve(curveSteCrvPool.address, stEthBalanceAfter)
      console.log('Adding liquidity by sending ETH and StEth to curve pool')
      // await curveSteCrvPool.add_liquidity([stEthBalanceAfter, stEthBalanceAfter], 0)
      const amount = ethers.utils.parseEther('1')
      console.log('Is enough balance', stEthBalanceAfter.gt(amount))
      await curveSteCrvPool.add_liquidity([amount, amount], 0, { value: amount })
      console.log('Geting STE_CRV token contract')
      const steCrv = await getToken(STE_CRV, recipient)
      const steCrvBalance = await steCrv.balanceOf(accAddress)
      console.log(`steCrvBalance`, ethers.utils.formatEther(steCrvBalance))
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

    const Strategy = await ethers.getContractFactory('StrategyCurveSteCRV') as StrategyCurveSteCRV__factory
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