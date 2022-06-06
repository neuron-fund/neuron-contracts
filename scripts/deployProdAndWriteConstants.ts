import { deploy } from './deployProd'
import { writeConstantsFile } from './writeConstantsFile'

async function main() {
  const deployedAddresses = await deploy()
  writeConstantsFile(deployedAddresses, 'mainnetAddresses')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
