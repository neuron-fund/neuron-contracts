import { EthereumProvider } from 'hardhat/types'

export const DAY = 60 * 60 * 24

export const waitNDays = async (n: number, provider: EthereumProvider) => {
  await provider.send('evm_increaseTime', [DAY * n])
  await provider.send('evm_mine')
}

export const waitWeek = (provider: EthereumProvider) => waitNDays(7, provider)