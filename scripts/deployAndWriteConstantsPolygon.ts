import { deploy } from './deployPolygon'
import { writeConstantsFile } from './writeConstantsFile'

async function main () {
  const deployedAddresses = await deploy()
  writeConstantsFile(deployedAddresses, 'polygonAddresses')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
