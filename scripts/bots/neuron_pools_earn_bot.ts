import { JsonRpcProvider } from '@ethersproject/providers'
import { ContractReceipt, Wallet } from 'ethers'
import { IMultiCall__factory, INeuronPool__factory } from '../../typechain-types'

interface ICONFIG {
  provider: JsonRpcProvider
  userPrivateKey: string
  multiCallAddress: string
  neuronPoolsAddresses: string[]
}

export async function neuronPoolsEarnBot(config: ICONFIG): Promise<ContractReceipt> {
  console.log(`Start neuronPoolsEarnBot`)

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
  console.log(`Finish neuronPoolsEarnBot`)
  return reciept;
}