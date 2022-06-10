import { ethers, deployments } from 'hardhat'
import { BigNumber, Signer } from 'ethers'
import { assert } from 'chai'
import {
  AggregatorV3Interface,
  AggregatorV3Interface__factory,
  ChainLinkPricer__factory,
  IAggregator__factory,
  INeuronPool,
  IOracle,
  IOracle__factory,
  IPricer,
  IPricer__factory,
  Oracle,
  Oracle__factory
} from '../typechain-types'
import TokenHelper from './helpers/TokenHelper'
import ERC20Minter from './helpers/ERC20Minter'
import { CRV3 } from '../constants/addresses'

interface IConfig {
  name: string
  subPricers: string[]
}

const configs: IConfig[] = [
  {
    name: 'CRV3Pricer',
    subPricers: ['ChainLinkPricerDAI', 'ChainLinkPricerUSDC', 'ChainLinkPricerUSDT'],
  },
]

describe('CRV3Pricer', () => {
  for (const config of configs) {
    testNeuronPoolPricers(config)
  }
})

function testNeuronPoolPricers(config: IConfig) {
  describe(`${config.name}`, () => {
    // --------------------------------------------------------
    // ----------------------  DEPLOY  ------------------------
    // --------------------------------------------------------

    let oracle: Oracle
    let crv3Pricer: IPricer
    let owner: Signer
    let user: Signer
    let initSnapshot: string

    before(async () => {
      await deployments.fixture([config.name, 'Oracle', ...config.subPricers])
      const CRV3PricerDeployment = await deployments.get(config.name)
      const OracleDeployment = await deployments.get('Oracle')

      const accounts = await ethers.getSigners()
      owner = accounts[0]
      user = accounts[10]
      crv3Pricer = (await ethers.getContractAt('IPricer', CRV3PricerDeployment.address)) as IPricer

      oracle = Oracle__factory.connect(OracleDeployment.address, owner)

      initSnapshot = await ethers.provider.send('evm_snapshot', [])
    })

    afterEach(async () => {
      ethers.provider.send('evm_revert', [initSnapshot])
    })

    xit(`Get price`, async () => {
      const price = await crv3Pricer.getPrice()

      console.log(`${price}`)
      assert(price.lt(ethers.utils.parseUnits('1.1', 8)), `Price more 1.1, = ${ethers.utils.parseUnits(`${price}`, 8)}`)
      assert(price.gt(ethers.utils.parseUnits('0.9', 8)), `Price low 0.9 = ${ethers.utils.parseUnits(`${price}`, 8)}`)
    })

    it(`Set expiry price in oracle`, async () => {
      const timeStamp = (Date.now() / 1000).toFixed(0)
      console.log('aw1')
      
      let minTimestamp: BigNumber;
      for (const SUB_PRICER of config.subPricers) {
        // await deployments.fixture([SUB_PRICER])
        const SubPricerDeployment = await deployments.get(SUB_PRICER)
        const subPricer = ChainLinkPricer__factory.connect(SubPricerDeployment.address, owner)
        const asset = await subPricer.asset()
        const subPricerSetInOracle = await oracle.getPricer(asset)
        if(subPricer.address != subPricerSetInOracle) {
          throw new Error('PRICER IN ORACLE DO NOT MATCH TESTS')
        }
        const agregator = IAggregator__factory.connect(await subPricer.aggregator(), owner)
        const latestTimestamp = await agregator.latestTimestamp()
        minTimestamp ||= latestTimestamp
        if (latestTimestamp.lt(minTimestamp)) {
          minTimestamp = latestTimestamp
        }
      }

      for (const SUB_PRICER of config.subPricers) {
        console.log('aw11')
        // await deployments.fixture([SUB_PRICER])
        console.log('aw12')
        const SubPricerDeployment = await deployments.get(SUB_PRICER)
        console.log('aw13')
        const subPricer = ChainLinkPricer__factory.connect(SubPricerDeployment.address, owner)
        console.log('aw14')
        const agregator = IAggregator__factory.connect(await subPricer.aggregator(), owner)
        const latestRound = await agregator.latestRound()
        await subPricer.setExpiryPriceInOracle(minTimestamp, latestRound)
        const asset = await subPricer.asset()
        const settedPrice = await oracle.getExpiryPrice(asset, minTimestamp)
        console.log('ORACLE ADDRESS', oracle.address)
        if (settedPrice[0].isZero()) {
          throw new Error(`PRICE FOR ${SUB_PRICER} WAS NOT SET IN ORACLE`)
        }
      }

      await crv3Pricer.setExpiryPriceInOracle(minTimestamp)
      const oraclePrice = await oracle.getExpiryPrice(CRV3, minTimestamp)

      console.log(`oraclePrice ${oraclePrice}`)
    })
  })
}
