import '@nomiclabs/hardhat-ethers'
import axios from 'axios'
import { formatEther, formatUnits, parseEther } from 'ethers/lib/utils'
import { deployments, ethers, network } from 'hardhat'
import { CURVE_3CRV_LP_TOKEN, CURVE_3CRV_POOL, POLYGON_CURVE_AM_3_CRV_LP_TOKEN } from '../constants/addresses'
import { Pools } from '../frontend/mainnetAddresses'
import { deploy } from '../scripts/deploy'
import { Gauge__factory, NeuronZap__factory } from '../typechain'

const { AddressZero } = ethers.constants

const ETH_WHALE = '0xE92d1A43df510F82C66382592a047d288f85226f'

describe('Test Zap', function () {

  let neuronZapAddres
  let user

  before(async () => {
    let signers = await ethers.getSigners()
    await network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [ETH_WHALE],
    })
    const whale = await ethers.getSigner(ETH_WHALE)
    user = whale
  })

  beforeEach(async function () {
    await deployments.fixture(['zap'])
    const zap = await deployments.get('NeuronZap')
    neuronZapAddres = zap.address
  })

  it('Test CurveZap', async function () {
    const zap = await NeuronZap__factory.connect(neuronZapAddres, user)

    const zapperRequest = axios.create({
      baseURL: 'https://api.zapper.fi/v1/zap-in/curve/transaction',
      params: {
        api_key: '5d1237c2-3840-4733-8e92-c5a58fe81b88',
        gasPrice: '69000000000',
        slippagePercentage: '0.03',
        network: 'ethereum',
      }
    })

    const sellAmount = parseEther('0.1')
    const sellAmountFormmatedWei = formatUnits(sellAmount, 'wei')
    const sellToken = AddressZero
    const buyToken = CURVE_3CRV_LP_TOKEN
    const neuronPool = Pools.Curve3Crv.poolAddress
    const neuronGauge = Pools.Curve3Crv.gaugeAddress

    const { data } = await zapperRequest.get('', {
      params: {
        ownerAddress: user.address,
        sellTokenAddress: sellToken,
        poolAddress: buyToken,
        sellAmount: sellAmountFormmatedWei,
      }
    }).catch(e => { console.table(e); throw e })

    const zapperContract = data.to
    const zapperCallData = data.data

    const res = await zap.zapIn(
      sellToken,
      buyToken,
      neuronPool,
      neuronGauge,
      sellAmount,
      zapperContract,
      zapperCallData,
      {
        value: sellAmount
      }
    )
    console.log('res', res)

    const gauge = await Gauge__factory.connect(neuronGauge, user)
    const userGaugeBalance = await gauge.balanceOf(user.address)
    console.log(`userGaugeBalance`, userGaugeBalance)
    console.log(`userGaugeBalance`, formatEther(userGaugeBalance))
  })
})
