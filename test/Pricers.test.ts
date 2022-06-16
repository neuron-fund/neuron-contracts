import { ethers, deployments } from 'hardhat'
import { BigNumber, Signer } from 'ethers'
import { assert } from 'chai'
import {
  AggregatorV3Interface,
  AggregatorV3Interface__factory,
  ChainLinkPricer__factory,
  IAggregator__factory,
  INeuronPool,
  INeuronPool__factory,
  IOracle,
  IOracle__factory,
  IPricer,
  IPricer__factory,
  Oracle,
  Oracle__factory,
} from '../typechain-types'
import TokenHelper from './helpers/TokenHelper'
import ERC20Minter from './helpers/ERC20Minter'
import { CRV3, DAI, USDC, USDT } from '../constants/addresses'

interface IConfig {
  name: string
}

const configs: IConfig[] = [
  {
    name: 'ChainLinkPricerDAI',
  },
  {
    name: 'ChainLinkPricerUSDC',
  },
  {
    name: 'ChainLinkPricerUSDT',
  },
  {
    name: 'ChainLinkPricerFrax',
  },
  {
    name: 'ChainLinkPricerMIM',
  },
  {
    name: 'CRV3Pricer',
  },
  {
    name: 'NeuronPoolCurve3poolPricer',
  },
  {
    name: 'NeuronPoolCurveFraxPricer',
  },
  {
    name: 'NeuronPoolCurveMIMPricer',
  },
]

function isChainLinkPricer(pricer: string) {
  return pricer.includes('ChainLinkPricer')
}

function isNeuronPoolPricer(pricer: string) {
  return pricer.includes('NeuronPool')
}

describe('Pricers', () => {
  let minTimestamp: BigNumber
  before(async () => {
    const allPricers = configs.map(pricer => pricer.name)
    await deployments.fixture(['Oracle', ...allPricers])
    const accounts = await ethers.getSigners()
    const owner = accounts[0]

    for (const chainLinkPricer of allPricers.filter(pricer => isChainLinkPricer(pricer))) {
      const chainLinkPricerDeployment = await deployments.get(chainLinkPricer)
      const subPricer = ChainLinkPricer__factory.connect(chainLinkPricerDeployment.address, owner)
      const agregator = IAggregator__factory.connect(await subPricer.aggregator(), owner)
      const latestTimestamp = await agregator.latestTimestamp()
      minTimestamp ||= latestTimestamp
      if (latestTimestamp.lt(minTimestamp)) {
        minTimestamp = latestTimestamp
      }
    }
  })

  it('', () => {
    describe('', () => {
      for (const config of configs) {
        testPricers(config, minTimestamp)
      }
    })
  })
})

function testPricers(config: IConfig, minTimestamp: BigNumber) {
  describe(`${config.name}`, () => {
    // --------------------------------------------------------
    // ----------------------  DEPLOY  ------------------------
    // --------------------------------------------------------

    let oracle: Oracle
    let pricer: IPricer
    let owner: Signer
    let user: Signer
    let initSnapshot: string

    before(async () => {
      const accounts = await ethers.getSigners()
      owner = accounts[0]
      user = accounts[10]

      const CRV3PricerDeployment = await deployments.get(config.name)
      const OracleDeployment = await deployments.get('Oracle')
      oracle = Oracle__factory.connect(OracleDeployment.address, owner)

      pricer = (await ethers.getContractAt('IPricer', CRV3PricerDeployment.address)) as IPricer

      if (isNeuronPoolPricer(config.name)) {
        const neuronPool = INeuronPool__factory.connect(await pricer.asset(), owner)

        const tokenAddress = await neuronPool.token()
        await ERC20Minter.mint(tokenAddress, ethers.utils.parseEther('1000'), await user.getAddress())
        const token = await TokenHelper.getToken(tokenAddress)
        const tokenBalance = await token.balanceOf(await user.getAddress())
        await token.connect(user).approve(neuronPool.address, tokenBalance)
        await neuronPool.connect(user).deposit(await neuronPool.token(), tokenBalance)
      }

      // initSnapshot = await ethers.provider.send('evm_snapshot', [])
    })

    // afterEach(async () => {
    //   ethers.provider.send('evm_revert', [initSnapshot])
    // })

    it(`Get price`, async () => {
      const price = await pricer.getPrice()

      console.log(`${price}`)
      assert(price.lt(ethers.utils.parseUnits('1.1', 8)), `Price more 1.1, = ${ethers.utils.parseUnits(`${price}`, 8)}`)
      assert(price.gt(ethers.utils.parseUnits('0.9', 8)), `Price low 0.9 = ${ethers.utils.parseUnits(`${price}`, 8)}`)
    })

    it(`Set expiry price in oracle`, async () => {
      if (isChainLinkPricer(config.name)) {
        const ChainLinkPricerDeployment = await deployments.get(config.name)
        const chainLinkPricer = ChainLinkPricer__factory.connect(ChainLinkPricerDeployment.address, owner)
        const agregator = IAggregator__factory.connect(await chainLinkPricer.aggregator(), owner)
        const latestRound = await agregator.latestRound()

        await chainLinkPricer.setExpiryPriceInOracle(minTimestamp, latestRound)

        const asset = await chainLinkPricer.asset()
        const oraclePrice = await oracle.getExpiryPrice(asset, minTimestamp)

        console.log(`oraclePrice ${oraclePrice}`)
        assert(oraclePrice[0].gt(0), `oraclePrice is zero. asset ${asset}`)
      } else {
        const pricerDeployment = await deployments.get(config.name)
        const pricer = IPricer__factory.connect(pricerDeployment.address, owner)

        await pricer.setExpiryPriceInOracle(minTimestamp)

        const asset = await pricer.asset()
        const [oraclePrice] = await oracle.getExpiryPrice(asset, minTimestamp)

        console.log(`oraclePrice ${oraclePrice}`)
        assert(oraclePrice.gt(0), `oraclePrice is zero. asset ${asset}`)
      }
    })
  })
}
