
import "@nomiclabs/hardhat-ethers"
import { ethers, network } from "hardhat"
import { Signer } from "ethers"
import { IUniswapRouterV2 } from '../typechain/IUniswapRouterV2'
import { Controller__factory, ICurveFi, ICurveFi2, ICurveFi3, IERC20, IStEth, NeuronPool, NeuronPool__factory, StrategyCurveRenCRVv2__factory } from '../typechain'
import { assert } from 'chai'

const WBTC = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'
const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
const REN_CRV = '0x49849C98ae39Fff122806C06791Fa73784FB3675'

const CURVE_REN_CRV_POOL = '0x93054188d876f558f4a66B2EF1d97d16eDf0895B'
const UniswapRouterV2Address = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'

const getToken = async (address: string, signer: Signer) => {
  return (await ethers.getContractAt('IERC20', address, signer)) as IERC20
}

describe('Token', function () {
  let accounts: Signer[]

  beforeEach(async function () {
    accounts = await ethers.getSigners()

    const getRenCrv = async (recipient: Signer) => {
      const accAddress = await recipient.getAddress()
      const wbtc = await getToken(WBTC, recipient)
      const ethBalanceBefore = ethers.utils.formatEther(await recipient.getBalance())
      const wbtcBalanceBefore = ethers.utils.formatEther(await wbtc.balanceOf(accAddress))
      console.log(`ethBalanceBefore`, ethBalanceBefore)
      console.log(`wbtcBalanceBefore`, wbtcBalanceBefore)

      const uniswapRouter = await ethers.getContractAt('IUniswapRouterV2', UniswapRouterV2Address, recipient) as IUniswapRouterV2

      await uniswapRouter.swapExactETHForTokens(
        '0',
        [WETH, WBTC],
        await recipient.getAddress(),
        Date.now() + 30000,
        {
          gasLimit: 4000000,
          value: ethers.utils.parseEther("100"),
        },
      )

      const ethBalanceAfter = ethers.utils.formatEther((await recipient.getBalance()))
      const wbtcBalanceAfter = await wbtc.balanceOf(accAddress)
      console.log(`ethBalanceAfter`, ethBalanceAfter)
      console.log(`wbtcBalanceAfter`, ethers.utils.formatEther(wbtcBalanceAfter))
      const curveRenCrvPool = await ethers.getContractAt('ICurveFi_2', CURVE_REN_CRV_POOL, recipient) as ICurveFi2
      await wbtc.connect(recipient).approve(curveRenCrvPool.address, wbtcBalanceAfter)
      await curveRenCrvPool.add_liquidity([0, wbtcBalanceAfter], 0)
      const renCrv = await getToken(REN_CRV, recipient)
      const renCrvBalance = await renCrv.balanceOf(accAddress)
      console.log(`renCrvBalance`, ethers.utils.formatEther(renCrvBalance))
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

    const Strategy = await ethers.getContractFactory('StrategyCurveRenCRVv2') as StrategyCurveRenCRVv2__factory
    const strategy = await Strategy.deploy(
      await governance.getAddress(),
      await strategist.getAddress(),
      controller.address,
      await timelock.getAddress()
    )

    console.log('Assert strategy wants correct token')
    assert(await strategy.want() === REN_CRV)

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

    await getRenCrv(user)


    const renCrv = await getToken(REN_CRV, user)
    const renCrvUserBalanceInitial = await renCrv.balanceOf(await user.getAddress())
    console.log(`renCrvUserBalanceInitial`, ethers.utils.formatEther(renCrvUserBalanceInitial))
    await renCrv.connect(user).approve(neuronPool.address, renCrvUserBalanceInitial)

    console.log('Connect user to pool')
    const neuronPoolUserConnected = await neuronPool.connect(user)
    console.log('Depositing to pool')
    await neuronPoolUserConnected.deposit(renCrvUserBalanceInitial)
    console.log('Execute pools earn function')
    await neuronPool.earn()

    console.log('Time travel one week later')
    const oneWeekInSeconds = 60 * 60 * 24 * 7
    await network.provider.send('evm_increaseTime', [oneWeekInSeconds])
    await network.provider.send('evm_mine')

    console.log('Strategy harvest')
    await strategy.harvest()

    // Withdraws back to pickleJar
    const inPoolBefore = await renCrv.balanceOf(neuronPool.address)
    console.log(`inPoolBefore`, ethers.utils.formatEther(inPoolBefore))
    console.log('Withdraw all from controller')
    await controller.withdrawAll(renCrv.address)
    const inPoolAfter = await renCrv.balanceOf(neuronPool.address)
    console.log(`inPoolAfter`, ethers.utils.formatEther(inPoolAfter))

    assert(inPoolAfter.gt(inPoolBefore), 'Unsuccesfull withdraw from strategy to pool')

    const renCrvUserBalanceBefore = await renCrv.balanceOf(await user.getAddress())
    console.log(`renCrvUserBalanceBefore`, ethers.utils.formatEther(renCrvUserBalanceBefore))
    console.log('Widthdraw from pool to user')
    await neuronPoolUserConnected.withdrawAll()
    const renCrvUserBalanceAfter = await renCrv.balanceOf(await user.getAddress())
    console.log(`renCrvUserBalanceAfter`, ethers.utils.formatEther(renCrvUserBalanceAfter))

    assert(renCrvUserBalanceAfter.gt(renCrvUserBalanceBefore), 'Unsuccesfull withdraw from pool to user')

    // Gained some interest
    assert(renCrvUserBalanceAfter.gt(renCrvUserBalanceInitial), 'User have not got any interest after deposit')
  })

  it('should do something right', async function () {
    // const box = await Box.attach(address)
  })
})