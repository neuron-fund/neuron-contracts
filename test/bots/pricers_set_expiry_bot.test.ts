import { BigNumber } from "ethers";
import { deployments, ethers } from "hardhat";
import { neuron_pools_earn_bot } from "../../scripts/bots/neuron_pools_earn_bot";
import { pricers_set_expiry_bot } from "../../scripts/bots/pricers_set_expiry_bot";
import { ChainLinkPricer__factory, IAggregator__factory } from "../../typechain-types";

describe('pricers_set_expiry_bot', () => {
    it('call', async () => {
        const config = {
            provider: ethers.provider,
            userPrivateKey: '0xaffa804effc545c554fe69095fe54d2e9a35ecee306927f7f5705a2813371764',
            multiCallAddress: '0xeefBa1e63905eF1D7ACbA5a8513c70307C1cE441',
            expiryTimestamp: BigNumber.from('0'),
            chainLinkPricersAddresses: [],
            pricersAddresses: [],
        }
        const chainLinkPricers = [
            'ChainLinkPricerDAI',
            'ChainLinkPricerUSDC',
            'ChainLinkPricerUSDT',
            'ChainLinkPricerFrax',
            'ChainLinkPricerETH',
            'ChainLinkPricerSTETH',
            'ChainLinkPricerWBTC',
            'ChainLinkPricerMIM',
        ]
        const pricers = [
            'CRV3Pricer',
            'NeuronPoolCurve3poolPricer',
            'NeuronPoolCurveFraxPricer',
            'NeuronPoolCurveMIMPricer',
            'NeuronPoolCurveSTETHPricer',
            'NeuronPoolCurveLUSDPricer',
            'NeuronPoolCurveALETHPricer',
            'NeuronPoolCurveRenPricer',
            'NeuronPoolCurveSBTCPricer',
        ]
        let expiryTimestamp: BigNumber;
        await deployments.fixture([...chainLinkPricers, ...pricers])
        for (const contract of chainLinkPricers) {
            config.chainLinkPricersAddresses.push((await deployments.get(contract)).address)
            
            if(!expiryTimestamp) {
                const chainLinkPricerDeployment = await deployments.get(contract)
                const subPricer = ChainLinkPricer__factory.connect(chainLinkPricerDeployment.address, ethers.provider)
                const agregator = IAggregator__factory.connect(await subPricer.aggregator(), ethers.provider)
                const latestTimestamp = await agregator.latestTimestamp()
                expiryTimestamp = latestTimestamp.sub(24 * 60 * 60)
            }
        }
        config.expiryTimestamp = expiryTimestamp
        for (const contract of pricers) {
            config.pricersAddresses.push((await deployments.get(contract)).address)
        }
        await pricers_set_expiry_bot(config);
    })
})