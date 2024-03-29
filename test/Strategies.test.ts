import { ethers, deployments, network } from 'hardhat'
import { assert } from 'chai'
import { INeuronPool, IERC20, IConvexBooster, StrategyConvexFarmBase, IStrategy } from '../typechain-types'
import { CONVEX_BOOSTER, CRV, CVX, FXS, LQTY, SPELL, ETH } from '../constants/addresses'
import { waitNDays } from '../utils/time'
import ERC20Minter from './helpers/ERC20Minter'
import { BigNumber, Signer } from 'ethers'

interface IConfig {
  startegy: string
  neuronPool: string
  rewardTokens: string[]
  claimConvexRewards: boolean
}

const CONFIGS: IConfig[] = [
  {
    startegy: 'StrategyConvexCurve3Pool',
    neuronPool: 'NeuronPoolCurve3pool',
    rewardTokens: [CRV, CVX],
    claimConvexRewards: true,
  },
  {
    startegy: 'StrategyConvexCurveFrax',
    neuronPool: 'NeuronPoolCurveFrax',
    rewardTokens: [CRV, CVX, FXS],
    claimConvexRewards: true,
  },
  {
    startegy: 'StrategyConvexCurveMIM',
    neuronPool: 'NeuronPoolCurveMIM',
    rewardTokens: [CRV, CVX, SPELL],
    claimConvexRewards: true,
  },
  {
    startegy: 'StrategyStabilityPoolLUSD',
    neuronPool: 'NeuronPoolStabilityPoolLUSD',
    rewardTokens: [ETH, LQTY],
    claimConvexRewards: false,
  },
  {
    startegy: 'StrategyConvexCurveHBTC',
    neuronPool: 'NeuronPoolCurveHBTC',
    rewardTokens: [CRV, CVX],
    claimConvexRewards: true,
  },
  {
    startegy: 'StrategyConvexCurveRen',
    neuronPool: 'NeuronPoolCurveRen',
    rewardTokens: [CRV, CVX],
    claimConvexRewards: true,
  },
  {
    startegy: 'StrategyConvexCurveALETH',
    neuronPool: 'NeuronPoolCurveALETH',
    rewardTokens: [CRV, CVX],
    claimConvexRewards: true,
  },
  {
    startegy: 'StrategyConvexCurveSTETH',
    neuronPool: 'NeuronPoolCurveSTETH',
    rewardTokens: [CRV, CVX],
    claimConvexRewards: true,
  },
  {
    startegy: 'StrategyConvexCurveSBTC',
    neuronPool: 'NeuronPoolCurveSBTC',
    rewardTokens: [CRV, CVX],
    claimConvexRewards: true,
  },
]

describe('Strategies tests', () => {
  for (const CONFIG of CONFIGS) {
    startegyTests(CONFIG)
  }
})

function startegyTests(CONFIG: IConfig) {
  let initSnapshot: string
  let user: Signer
  let strategy: IStrategy
  let neuronPool: INeuronPool
  let wantToken: IERC20
  let wantTokenBalance: BigNumber

  describe(`${CONFIG.startegy}`, () => {
    before(async () => {
      const accounts = await ethers.getSigners()
      user = accounts[9]

      await deployments.fixture([CONFIG.startegy, CONFIG.neuronPool])
      const StartegyDeployment = await deployments.get(CONFIG.startegy)
      const NeuronPoolDeployment = await deployments.get(CONFIG.neuronPool)

      strategy = (await ethers.getContractAt('IStrategy', StartegyDeployment.address)) as IStrategy
      neuronPool = (await ethers.getContractAt('INeuronPool', NeuronPoolDeployment.address)) as INeuronPool
      wantToken = (await ethers.getContractAt(
        '@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20',
        await strategy.want()
      )) as IERC20

      console.log(`wantToken.address ${wantToken.address}`)
      await ERC20Minter.mint(wantToken.address, ethers.utils.parseEther('1000'), await user.getAddress())

      wantTokenBalance = await wantToken.balanceOf(await user.getAddress())
      console.log(`wantTokenBalance ${wantTokenBalance}`)
      await wantToken.connect(user).approve(neuronPool.address, wantTokenBalance)
      await neuronPool.connect(user).deposit(wantToken.address, wantTokenBalance)
      const earnTransaction = await neuronPool.earn()
      await waitNDays(7 * 12, network.provider)

      const startegyBalance = await strategy.balanceOfPool()
      assert(startegyBalance.gt(0), 'Not deposited')

      if (CONFIG.claimConvexRewards) {
        const strat = (await ethers.getContractAt('StrategyConvexFarmBase', strategy.address)) as StrategyConvexFarmBase
        const booster = (await ethers.getContractAt('IConvexBooster', CONVEX_BOOSTER)) as IConvexBooster
        await booster.earmarkRewards(await strat.convexPoolId())
      }

      initSnapshot = await ethers.provider.send('evm_snapshot', [])
    })

    afterEach(async () => {
      await ethers.provider.send('evm_revert', [initSnapshot])
      initSnapshot = await ethers.provider.send('evm_snapshot', [])
    })

    for (const REWARD of CONFIG.rewardTokens) {
      it(`Harvest reward ${REWARD} token test`, async () => {
        const transaction = await strategy.harvest()
        assert(
          (await transaction.wait()).events.filter(
            event => event.event == 'RewardToken' && event.args[0] == REWARD && event.args[1] > 0
          ).length > 0,
          `Not rewarded`
        )
      })
    }

    it(`Withdraw`, async () => {
      await strategy.harvest()
      await neuronPool.connect(user).withdrawAll(wantToken.address)
      const resultBalance = await wantToken.balanceOf(await user.getAddress())

      console.log(`resultBalance ${resultBalance}`)

      assert(resultBalance.gt(wantTokenBalance), 'Tokens not farmed')
    })
  })
}
