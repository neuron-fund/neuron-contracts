
import { writeFileSync } from 'fs'
import path from 'path'

export const writeConstantsFile = ({
  neuronTokenAddress,
  controllerAddress,
  masterChefAddress,
  gaugesDistributorAddress,
  axonAddress,
  feeDistributorAddress,
  deployedStrategies
}, fileName) => (
  writeFileSync(path.resolve(__dirname, `../frontend/${fileName}.ts`), `
    export const NeuronTokenAddress = '${neuronTokenAddress}'
    export const ControllerAddress = '${controllerAddress}'
    export const MasterChefAddress = '${masterChefAddress}'
    export const GaugeDistributorAddress = '${gaugesDistributorAddress}'
    export const AxonAddress = '${axonAddress}'
    export const FeeDistributorAddress = '${feeDistributorAddress}'

    export const Pools = {
      ${deployedStrategies.map(({ neuronPoolAddress, strategyAddress, strategyName, inputTokenSymbol, inputTokenAddress, gaugeAddress }) =>
        `
        ${strategyName}: {
          strategyAddress: '${strategyAddress}',
          poolAddress: '${neuronPoolAddress}',
          gaugeAddress: '${gaugeAddress}',
          inputTokenAddress: '${inputTokenAddress}',
          inputTokenSymbol: '${inputTokenSymbol}',
        },

      `).join('')}
    }
    `)
)