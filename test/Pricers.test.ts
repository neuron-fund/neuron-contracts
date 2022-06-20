import { ethers, deployments } from 'hardhat'
import { BigNumber, Signer } from 'ethers'
import { assert } from 'chai'
import {
  ChainLinkPricer,
  ChainLinkPricer__factory,
  IAggregator__factory,
  INeuronPool__factory,
  IPricer,
  IPricer__factory,
  Oracle,
  Oracle__factory,
} from '../typechain-types'
import TokenHelper from './helpers/TokenHelper'
import ERC20Minter from './helpers/ERC20Minter'

interface IConfig {
  name: string
  price: number
  slippage: number
}

const configs: IConfig[] = [
  {
    name: 'ChainLinkPricerDAI',
    price: 1,
    slippage: 0.05,
  },
  {
    name: 'ChainLinkPricerUSDC',
    price: 1,
    slippage: 0.05,
  },
  {
    name: 'ChainLinkPricerUSDT',
    price: 1,
    slippage: 0.05,
  },
  {
    name: 'ChainLinkPricerFrax',
    price: 1,
    slippage: 0.05,
  },
  {
    name: 'ChainLinkPricerETH',
    price: 1200,
    slippage: 0.9,
  },
  {
    name: 'ChainLinkPricerSTETH',
    price: 1200,
    slippage: 0.9,
  },
  {
    name: 'ChainLinkPricerWBTC',
    price: 20000,
    slippage: 0.8,
  },
  {
    name: 'ChainLinkPricerRen',
    price: 20000,
    slippage: 0.8,
  },
  {
    name: 'ChainLinkPricerMIM',
    price: 1,
    slippage: 0.05,
  },
  {
    name: 'CRV3Pricer',
    price: 1,
    slippage: 0.05,
  },
  {
    name: 'NeuronPoolCurve3poolPricer',
    price: 1,
    slippage: 0.05,
  },
  {
    name: 'NeuronPoolCurveFraxPricer',
    price: 1,
    slippage: 0.05,
  },
  {
    name: 'NeuronPoolCurveMIMPricer',
    price: 1,
    slippage: 0.05,
  },
  {
    name: 'NeuronPoolCurveSTETHPricer',
    price: 1200,
    slippage: 0.9,
  },
  {
    name: 'NeuronPoolCurveLUSDPricer',
    price: 1,
    slippage: 0.05,
  },
  {
    name: 'NeuronPoolCurveALETHPricer',
    price: 1200,
    slippage: 0.9,
  },
  {
    name: 'NeuronPoolCurveRenPricer',
    price: 20000,
    slippage: 0.8,
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
    console.log('aw10');
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
    
    console.log('aw100');
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

    let oracle: Oracle
    let pricer: IPricer
    let owner: Signer
    let user: Signer

    before(async () => {
      console.log('aw1');
      const accounts = await ethers.getSigners()
      owner = accounts[0]
      user = accounts[10]

      console.log('aw12');
      const CRV3PricerDeployment = await deployments.get(config.name)
      const OracleDeployment = await deployments.get('Oracle')
      oracle = Oracle__factory.connect(OracleDeployment.address, owner)

      console.log('aw13');
      pricer = (await ethers.getContractAt('IPricer', CRV3PricerDeployment.address)) as IPricer

      console.log('aw14');
      if (isNeuronPoolPricer(config.name)) {
        const neuronPool = INeuronPool__factory.connect(await pricer.asset(), owner)

        console.log('aw15');
        const tokenAddress = await neuronPool.token()
        await ERC20Minter.mint(tokenAddress, ethers.utils.parseEther('1000'), await user.getAddress())
        const token = await TokenHelper.getToken(tokenAddress)
        const tokenBalance = await token.balanceOf(await user.getAddress())
        await token.connect(user).approve(neuronPool.address, tokenBalance)
        await neuronPool.connect(user).deposit(await neuronPool.token(), tokenBalance)
      }
    })

    it(`Get price`, async () => {
      const price = await pricer.getPrice()

      const minPrice = config.price - config.price * config.slippage;
      const maxPrice = config.price + config.price * config.slippage;
      
      assert(price.lt(ethers.utils.parseUnits(`${maxPrice}`, 8)), `Price more ${maxPrice}, = ${ethers.utils.formatUnits(`${price}`, 8)}`)
      assert(price.gt(ethers.utils.parseUnits(`${minPrice}`, 8)), `Price low ${minPrice} = ${ethers.utils.formatUnits(`${price}`, 8)}`)
    })

    it(`Set expiry price in oracle`, async () => {
      const pricerDeployment = await deployments.get(config.name)
      let pricer: IPricer | ChainLinkPricer

      if (isChainLinkPricer(config.name)) {
        const chainlinkPricer = ChainLinkPricer__factory.connect(pricerDeployment.address, owner)
        const agregator = IAggregator__factory.connect(await chainlinkPricer.aggregator(), owner)
        const latestRound = await agregator.latestRound()
        await chainlinkPricer.setExpiryPriceInOracle(minTimestamp, latestRound)

        pricer = chainlinkPricer
      } else {
        const neuronPoolPricer = IPricer__factory.connect(pricerDeployment.address, owner)
        await neuronPoolPricer.setExpiryPriceInOracle(minTimestamp)

        pricer = neuronPoolPricer
      }

      const asset = await pricer.asset()
      const [oraclePrice] = await oracle.getExpiryPrice(asset, minTimestamp)

      console.log(`oraclePrice ${oraclePrice}`)
      assert(oraclePrice.gt(0), `oraclePrice is zero. asset ${asset}`)
    })
  })
}
