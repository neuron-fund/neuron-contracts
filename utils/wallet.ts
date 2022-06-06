import { ethers } from 'ethers'
import { Provider } from '@ethersproject/providers'

export function generatePrivateKey() {
  return ethers.Wallet.createRandom().privateKey
}
