import { JsonRpcProvider } from '@ethersproject/providers'
import { ContractReceipt, Wallet } from 'ethers'
import { IMultiCall__factory, INeuronPool__factory } from '../../typechain-types'

interface ICONFIG {
  provider: JsonRpcProvider
  userPrivateKey: string
  multiCallAddress: string
  neuronPoolsAddresses: string[]
}

const CONFIG: ICONFIG = {
  provider: new JsonRpcProvider('https://mainnet.infura.io/v3/32c869b2294046f4931f3d8b93b2dae0'),
  userPrivateKey: '0xaffa804effc545c554fe69095fe54d2e9a35ecee306927f7f5705a2813371764',
  multiCallAddress: '0xeefBa1e63905eF1D7ACbA5a8513c70307C1cE441',
  neuronPoolsAddresses: [

  ],
}

export async function neuron_pools_earn_bot(_config?: ICONFIG): Promise<ContractReceipt> {
  console.log(`Start neuron_pools_earn_bot`)
  const isProduction = !_config
  const config = isProduction ? CONFIG : _config

  const provider = config.provider
  const user = new Wallet(config.userPrivateKey).connect(provider)
  const pools = config.neuronPoolsAddresses
  const calls = []
  for (let pool of pools) {
    const iface = INeuronPool__factory.createInterface()
    const data = iface.encodeFunctionData('earn')
    calls.push({
      target: pool,
      callData: data,
    })
  }
  const multiCall = IMultiCall__factory.connect(config.multiCallAddress, user)
  const tx = await multiCall.aggregate(calls)
  const reciept = await tx.wait();
  console.log(`Finish neuron_pools_earn_bot`)
  return reciept;
}

if (process.env.MODE == 'production') {
  neuron_pools_earn_bot()
}
