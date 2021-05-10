
import "@nomiclabs/hardhat-ethers"
import { ethers, network } from "hardhat"
import { Signer } from "ethers"
import { IUniswapRouterV2 } from '../typechain/IUniswapRouterV2'
import { Controller__factory, IERC20, NeuronPool__factory, StrategyFeiTribeLp__factory } from '../typechain'
import { assert } from 'chai'


const WBTC = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'
const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
const REN_CRV = '0x49849C98ae39Fff122806C06791Fa73784FB3675'
const FEI = '0x956F47F50A910163D8BF957Cf5846D573E7f87CA'
const TRIBE = '0xc7283b66Eb1EB5FB86327f08e1B5816b0720212B'
// User stakes FEI and TRIBE to Uniswap (FEI-TRIBE) pool and gets this tokens
const UNI_FEI_TRIBE = '0x9928e4046d7c6513326cCeA028cD3e7a91c7590A'

// Tokens that user got from staking to FEI-TRIBE to Uni we put into fei.money pool which gives TRIBE token for that 
const FEI_REWARDS_POOL = '0x18305DaAe09Ea2F4D51fAa33318be5978D251aBd'
const UniswapRouterV2Address = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'

const getToken = async (address: string, signer: Signer) => {
  return (await ethers.getContractAt('IERC20', address, signer)) as IERC20
}

const { formatEther } = ethers.utils
describe('Token', function () {
  let accounts: Signer[]

  beforeEach(async function () {
    accounts = await ethers.getSigners()

    const getFeiTribe = async (recipient: Signer) => {
      const accAddress = await recipient.getAddress()
      const fei = await getToken(FEI, recipient)
      const tribe = await getToken(TRIBE, recipient)
      const ethBalanceBefore = formatEther(await recipient.getBalance())
      console.log(`ethBalanceBefore`, ethBalanceBefore)
      const feiBalanceBefore = formatEther(await fei.balanceOf(accAddress))
      console.log(`feiBalanceBefore`, feiBalanceBefore)
      const tribeBalanceBefore = formatEther(await tribe.balanceOf(accAddress))
      console.log(`tribeBalanceBefore`, tribeBalanceBefore)

      const uniswapRouter = await ethers.getContractAt('IUniswapRouterV2', UniswapRouterV2Address, recipient) as IUniswapRouterV2
      const getFeiPath = [WETH, FEI]
      const getTribePath = [WETH, FEI, TRIBE]
      const tokensAmount = ethers.utils.parseEther("1000")
      console.log('Getting fei tokens through uniswap swap')
      await uniswapRouter.swapETHForExactTokens(
        tokensAmount,
        getFeiPath,
        await recipient.getAddress(),
        Date.now() + 60,
        {
          value: tokensAmount,
        },
      )
      console.log('Getting tribe tokens through uniswap swap')
      await uniswapRouter.swapETHForExactTokens(
        tokensAmount,
        getTribePath,
        await recipient.getAddress(),
        Date.now() + 60,
        {
          value: tokensAmount,
        },
      )

      const ethBalanceAfter = formatEther(await recipient.getBalance())
      console.log(`ethBalanceAfter`, ethBalanceAfter)
      const feiBalanceAfter = await fei.balanceOf(accAddress)
      console.log(`feiBalanceAfter`, formatEther(feiBalanceAfter))
      const tribeBalanceAfter = await tribe.balanceOf(accAddress)
      console.log(`tribeBalanceAfter`, formatEther(tribeBalanceAfter))

      await fei.approve(UniswapRouterV2Address, 0)
      await fei.approve(UniswapRouterV2Address, feiBalanceAfter)
      await tribe.approve(UniswapRouterV2Address, 0)
      await tribe.approve(UniswapRouterV2Address, tribeBalanceAfter)

      console.log('Add liquidity to uniswap TRIBE-FEI pool')
      await uniswapRouter.addLiquidity(
        FEI,
        TRIBE,
        feiBalanceAfter,
        tribeBalanceAfter,
        0,
        0,
        accAddress,
        Date.now() + 30000,
      )

      const uniFeiTribe = await getToken(UNI_FEI_TRIBE, recipient)
      const uniFeiTribeBalance = await uniFeiTribe.balanceOf(accAddress)
      console.log(`uniFeiTribeBalance`, formatEther(uniFeiTribeBalance))
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

    const Strategy = await ethers.getContractFactory('StrategyFeiTribeLp') as StrategyFeiTribeLp__factory
    const strategy = await Strategy.deploy(
      await governance.getAddress(),
      await strategist.getAddress(),
      controller.address,
      await timelock.getAddress()
    )

    console.log('Assert strategy wants correct token')
    assert(await strategy.want() === UNI_FEI_TRIBE)

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

    await getFeiTribe(user)


    const uniFeiTribe = await getToken(UNI_FEI_TRIBE, user)
    // Since we get rewards in tribe we must check thats we get more tribe after withdraw for strategy
    const tribe = await getToken(TRIBE, user)
    const uniFeiTribeUserBalanceInitial = await uniFeiTribe.balanceOf(await user.getAddress())
    console.log(`uniFeiTribeUserBalanceInitial`, formatEther(uniFeiTribeUserBalanceInitial))
    const tribeUserBalanceInitial = await tribe.balanceOf(await user.getAddress())
    console.log(`tribeUserBalanceInitial`, formatEther(tribeUserBalanceInitial))
    await uniFeiTribe.connect(user).approve(neuronPool.address, uniFeiTribeUserBalanceInitial)

    console.log('Connect user to pool')
    const neuronPoolUserConnected = await neuronPool.connect(user)
    console.log('Depositing to pool')
    await neuronPoolUserConnected.deposit(uniFeiTribeUserBalanceInitial)
    console.log('Execute pools earn function')
    await neuronPool.earn()

    console.log('Time travel one week later')
    const oneWeekInSeconds = 60 * 60 * 24 * 7
    await network.provider.send('evm_increaseTime', [oneWeekInSeconds])
    await network.provider.send('evm_mine')

    console.log('Strategy harvest')
    await strategy.harvest()

    // Withdraws back to pickleJar
    const inPoolBefore = await uniFeiTribe.balanceOf(neuronPool.address)
    console.log(`inPoolBefore`, formatEther(inPoolBefore))
    console.log('Withdraw all from controller')
    await controller.withdrawAll(uniFeiTribe.address)
    const inPoolAfter = await uniFeiTribe.balanceOf(neuronPool.address)
    console.log(`inPoolAfter`, formatEther(inPoolAfter))

    assert(inPoolAfter.gt(inPoolBefore), 'Unsuccesfull withdraw from strategy to pool')

    const uniFeiTribeUserBalanceBefore = await uniFeiTribe.balanceOf(await user.getAddress())
    console.log(`uniFeiTribeUserBalanceBefore`, formatEther(uniFeiTribeUserBalanceBefore))
    console.log('Widthdraw from pool to user')
    await neuronPoolUserConnected.withdrawAll()
    const uniFeiTribeUserBalanceAfter = await uniFeiTribe.balanceOf(await user.getAddress())
    console.log(`uniFeiTribeUserBalanceAfter`, formatEther(uniFeiTribeUserBalanceAfter))
    const tribeUserBalanceAfter = await tribe.balanceOf(await user.getAddress())
    console.log(`tribeUserBalanceAfter`, formatEther(tribeUserBalanceAfter))

    assert(uniFeiTribeUserBalanceAfter.gt(uniFeiTribeUserBalanceBefore), 'Unsuccesfull withdraw from pool to user')

    // Gained some interest
    assert(tribeUserBalanceInitial.gt(tribeUserBalanceAfter), 'User have not got any interest after deposit')
  })

  it('should do something right', async function () {
    // const box = await Box.attach(address)
  })
})