import '@nomiclabs/hardhat-ethers'
import { network } from 'hardhat'

async function main() {
  for (let i = 1; i <= 40; i++) {
    await network.provider.send('evm_mine')
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
