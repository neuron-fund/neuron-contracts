
import "@nomiclabs/hardhat-ethers"
import { ethers, network } from "hardhat"
import { BigNumber, Signer, constants as ethersConstants } from "ethers"
import { ERC20, IConvexBooster, AxonVyper__factory, Controller__factory, FeeDistributor__factory, GaugesDistributor__factory, ICurveFi3, IERC20, IERC20__factory, IUniswapRouterV2__factory, IWETH__factory, MasterChef__factory, NeuronPool__factory, NeuronToken__factory, StrategyConvexCurve3Lp__factory } from '../typechain'
import { assert } from 'chai'
import { CRV, SUSHISWAP_ROUTER, CURVE_3CRV_LP_TOKEN, TRIBE, WETH, CONVEX_BOOSTER } from '../constants/addresses'
import { get3Crv, getToken } from '../utils/getCurveTokens'
import { parseEther } from 'ethers/lib/utils'
import { waitNDays } from '../utils/time'

describe('Token', function () {
  let accounts: Signer[]

  it('Test StrategyConvexCurve3Lp', async function () {
    accounts = await ethers.getSigners()

    const deployer = accounts[0]
    const governance = deployer
    const strategist = deployer
    const timelock = deployer
    const devfund = accounts[1]
    const treasury = accounts[2]
    const user = accounts[3]

    const deployerAddress = await deployer.getAddress()
    const governanceAddress = await governance.getAddress()
    const devAddress = await devfund.getAddress()
    const treasuryAddress = await treasury.getAddress()
    const timelockAddress = await timelock.getAddress()

    const neuronsPerBlock = parseEther('0.3')
    const startBlock = 0
    const bonusEndBlock = 0

    const NeuronToken = await ethers.getContractFactory('NeuronToken') as NeuronToken__factory
    const Masterchef = await ethers.getContractFactory('MasterChef', deployer) as MasterChef__factory
    const GaugesDistributor = await ethers.getContractFactory('GaugesDistributor', deployer) as GaugesDistributor__factory
    const AxonVyper = await ethers.getContractFactory('AxonVyper', deployer) as AxonVyper__factory
    const FeeDistributor = await ethers.getContractFactory('FeeDistributor', deployer) as FeeDistributor__factory

    const neuronToken = await NeuronToken.deploy(governanceAddress)
    await neuronToken.deployed()
    await neuronToken.setMinter(deployerAddress)
    await neuronToken.applyMinter()
    await neuronToken.mint(deployerAddress, parseEther('100000'))
    const sushiRouter = await IUniswapRouterV2__factory.connect(SUSHISWAP_ROUTER, deployer)
    const wethContract = await IWETH__factory.connect(WETH, deployer)
    await wethContract.deposit({ value: parseEther('10') })

    await neuronToken.approve(SUSHISWAP_ROUTER, ethersConstants.MaxUint256)
    await wethContract.approve(SUSHISWAP_ROUTER, ethersConstants.MaxUint256)

    const deadline = Math.floor(Date.now() / 1000) + 20000000

    await sushiRouter.addLiquidity(
      WETH,
      neuronToken.address,
      await wethContract.balanceOf(deployerAddress),
      await neuronToken.balanceOf(deployerAddress),
      0,
      0,
      deployerAddress,
      deadline,
    )

    const masterChef = await Masterchef.deploy(neuronToken.address, governanceAddress, devAddress, treasuryAddress, neuronsPerBlock, startBlock, bonusEndBlock)
    await masterChef.deployed()

    await neuronToken.setMinter(masterChef.address)
    await neuronToken.applyMinter()
    await neuronToken.setMinter(deployerAddress)
    await neuronToken.applyMinter()

    const Controller = await ethers.getContractFactory('Controller') as Controller__factory

    const controller = await Controller.deploy(
      await governance.getAddress(),
      await strategist.getAddress(),
      await timelock.getAddress(),
      await devfund.getAddress(),
      await treasury.getAddress()
    )


    const axon = await AxonVyper.deploy(neuronToken.address, 'veNEUR token', 'veNEUR', '1.0')
    await axon.deployed()
    const currentBlock = await network.provider.send("eth_getBlockByNumber", ["latest", true])
    const feeDistributor = await FeeDistributor.deploy(axon.address, currentBlock.timestamp, neuronToken.address, deployerAddress, deployerAddress)
    const gaugesDistributor = await GaugesDistributor.deploy(masterChef.address, neuronToken.address, axon.address, governanceAddress, governanceAddress)
    await gaugesDistributor.deployed()
    await masterChef.setDistributor(gaugesDistributor.address)

    const strategyFactory = await ethers.getContractFactory('StrategyConvexCurve3Lp') as StrategyConvexCurve3Lp__factory

    const strategy = await strategyFactory.deploy(
      await governance.getAddress(),
      await strategist.getAddress(),
      controller.address,
      neuronToken.address,
      await timelock.getAddress()
    )

    const NeuronPool = await ethers.getContractFactory('NeuronPool') as NeuronPool__factory
    const neuronPool = await NeuronPool.deploy(
      await strategy.want(),
      governanceAddress,
      timelockAddress,
      controller.address,
      masterChef.address,
      gaugesDistributor.address
    )
    await neuronPool.deployed()

    await controller.setNPool(await strategy.want(), neuronPool.address)
    await controller.approveStrategy(await strategy.want(), strategy.address)
    await controller.setStrategy(await strategy.want(), strategy.address)


    const neuronPoolAddress = neuronPool.address
    await gaugesDistributor.addGauge(neuronPoolAddress)
    await gaugesDistributor.setWeights([neuronPoolAddress], [BigNumber.from('100')])

    // Wait for masterchef to mint tokens for gauges distributor
    await waitNDays(10, network.provider)

    await gaugesDistributor.distribute()
    await get3Crv(user)

    const threeCrv = await getToken(CURVE_3CRV_LP_TOKEN, user)
    const threeCrvUserBalanceInitial = await threeCrv.balanceOf(await user.getAddress())
    console.log(`threeCrvUserBalanceInitial`, ethers.utils.formatEther(threeCrvUserBalanceInitial))
    await threeCrv.connect(user).approve(neuronPool.address, threeCrvUserBalanceInitial)

    console.log('Connect user to pool')
    const neuronPoolUserConnected = neuronPool.connect(user)
    console.log('Depositing to pool')
    await neuronPoolUserConnected.deposit(threeCrvUserBalanceInitial)
    console.log('Execute pools earn function')
    await neuronPool.earn()

    console.log('Time travel 12 week later')
    const weeksInSeconds = 60 * 60 * 24 * 7 * 12
    await network.provider.send('evm_increaseTime', [weeksInSeconds])
    await network.provider.send('evm_mine')

    // Update pool
    const booster = await ethers.getContractAt('IConvexBooster', CONVEX_BOOSTER, accounts[10]) as IConvexBooster;
    booster.earmarkRewards(await strategy.convexPoolId());

    console.log('Strategy harvest')
    const tx = await strategy.harvest()
    const receitp = await tx.wait()

    // check harvest cvx
    const cvxHarvested = receitp.events.find(x => x.event == 'CvxHarvested').args[0];
    console.log(`cvxHarvested = ${cvxHarvested} CVX`);
    assert(!cvxHarvested.isZero(), '!CvxHarvested');

    // check harvest crv
    const crvHarvested = receitp.events.find(x => x.event == 'CrvHarvested').args[0];
    console.log(`crvHarvested = ${crvHarvested} CRV`);
    assert(!crvHarvested.isZero(), '!CrvHarvested');

    // check deposit after harvest
    const deposited = receitp.events.find(x => x.event == 'Deposited').args[0];
    console.log(`deposited = ${deposited} 3Crv`);
    assert(!deposited.isZero(), '!Deposited');

    await neuronPool.connect(user).withdrawAll();
    const threeCrvUserBalanceResult = await threeCrv.balanceOf(await user.getAddress());
    
    console.log(`Initial 3crv balance: ${threeCrvUserBalanceInitial}`);
    console.log(`Result 3crv  balance: ${threeCrvUserBalanceResult}`);

    assert(threeCrvUserBalanceResult.gt(threeCrvUserBalanceInitial), 'not farmed');
  })
})