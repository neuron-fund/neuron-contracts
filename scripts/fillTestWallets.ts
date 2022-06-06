import '@nomiclabs/hardhat-ethers'
import { ethers, network } from 'hardhat'
import { ContractFactory, providers, Signer, Wallet } from 'ethers'
import { get3Crv, getFeiTribe, getRenCrv, getSteCrv } from '../utils/getCurveTokens'
import { sushiGetERC20WithEth } from '../utils/sushiTestUtils'
import { USDC } from '../constants/addresses'

const { formatEther, parseEther, parseUnits } = ethers.utils

async function main() {
  const privateKey = '0x27f64677f87074404da76c1dd2530c3491322d13a19b8195f1a6b2af3b0e633f'
  const [wallet] = await ethers.getSigners()

  console.log('Address: ' + formatEther(await wallet.getBalance()))

  await get3Crv(wallet)
  await getRenCrv(wallet)
  await getSteCrv(wallet)
  await getFeiTribe(wallet)
  await sushiGetERC20WithEth({ signer: wallet, tokenAddress: USDC, ethAmount: parseEther('50') })
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
