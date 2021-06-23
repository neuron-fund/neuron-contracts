
import "@nomiclabs/hardhat-ethers"
import { ethers, network } from "hardhat"
import { ContractFactory, providers, Signer, Wallet } from "ethers"
import { get3Crv, getFeiTribe, getRenCrv, getSteCrv } from '../utils/getCurveTokens'

const { formatEther, parseEther, parseUnits } = ethers.utils

async function main () {
  const privateKey = '0x27f64677f87074404da76c1dd2530c3491322d13a19b8195f1a6b2af3b0e633f'
  const provider = providers.getDefaultProvider('http://127.0.0.1:8545/')
  const wallet = new ethers.Wallet(privateKey, provider)

  console.log("Address: " + formatEther(await wallet.getBalance()))

  await get3Crv(wallet)
  await getRenCrv(wallet)
  await getSteCrv(wallet)
  await getFeiTribe(wallet)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })