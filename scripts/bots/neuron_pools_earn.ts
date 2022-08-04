import { JsonRpcProvider } from '@ethersproject/providers'
import { Wallet } from 'ethers'
import { IMultiCall__factory, INeuronPool__factory } from '../../typechain-types'

interface ICONFIG {
  provider: JsonRpcProvider
  user: string
  pools: string[]
}

const CONFIG: ICONFIG = {
  provider: new JsonRpcProvider('https://mainnet.infura.io/v3/32c869b2294046f4931f3d8b93b2dae0'),
  user: '0xaffa804effc545c554fe69095fe54d2e9a35ecee306927f7f5705a2813371764',
  pools: [

  ],
}

export async function neuron_pools_earn_bot(_config?: ICONFIG) {
  console.log(`Start neuron_pools_earn_bot`)
  const isProduction = !_config
  const config = isProduction ? CONFIG : _config

  const provider = config.provider
  const user = new Wallet(config.user).connect(provider)
  const pools = config.pools
  const calls = []
  for (let pool of pools) {
    const iface = INeuronPool__factory.createInterface()
    const data = iface.encodeFunctionData('earn')
    calls.push({
      target: pool,
      callData: data,
    })
  }
  const multiCallAddress = '0xeefBa1e63905eF1D7ACbA5a8513c70307C1cE441'
  const multiCall = IMultiCall__factory.connect(multiCallAddress, user)
  await multiCall.aggregate(calls)
  console.log(`Finish neuron_pools_earn_bot`)
}

if (process.env.MODE == 'production') {
  neuron_pools_earn_bot()
}
