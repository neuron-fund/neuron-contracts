import { deployments, ethers } from "hardhat";
import { neuron_pools_earn_bot } from "../../scripts/bots/neuron_pools_earn";

describe('neuron_pools_earn_bot', () => {
    it('call', async () => {
        const config = {
            provider: ethers.provider,
            user: '0xaffa804effc545c554fe69095fe54d2e9a35ecee306927f7f5705a2813371764',
            pools: []
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
            config.pools.push((await deployments.get(contract)).address)
        }
        await neuron_pools_earn_bot(config);
    })
})