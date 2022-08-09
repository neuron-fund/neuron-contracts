import { deployments, ethers } from "hardhat";
import { neuronPoolsEarnBot } from "../../scripts/bots/neuron_pools_earn_bot";

describe('neuronPoolsEarnBot', () => {
    it('call', async () => {
        const config = {
            provider: ethers.provider,
            userPrivateKey: '0xaffa804effc545c554fe69095fe54d2e9a35ecee306927f7f5705a2813371764',
            multiCallAddress: '0xeefBa1e63905eF1D7ACbA5a8513c70307C1cE441',
            neuronPoolsAddresses: []
        }
        const contracts = [
            'NeuronPoolCurve3pool',
            'NeuronPoolCurveFrax',
            'NeuronPoolCurveHBTC',
            'NeuronPoolCurveMIM',
            'NeuronPoolCurveRen',
            'NeuronPoolCurveALETH',
            'NeuronPoolCurveSTETH',
            'NeuronPoolStabilityPoolLUSD',
            'NeuronPoolCurveSBTC',
        ]
        await deployments.fixture([...contracts])
        for (const contract of contracts) {
            config.neuronPoolsAddresses.push((await deployments.get(contract)).address)
        }
        await neuronPoolsEarnBot(config);
    })
})