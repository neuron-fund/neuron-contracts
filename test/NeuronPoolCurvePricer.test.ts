import { ethers, deployments } from 'hardhat';
import { Signer } from 'ethers';
import { assert } from 'chai';
import { INeuronPool, IPricer } from '../typechain-types';
import TokenHelper from './helpers/TokenHelper';
import NetworkHelper from './helpers/NetworkHelper';


interface IConfig {
    name: string;
    neuronPool: string;
}

const configs: IConfig[] = [
    {
        name: 'NeuronPoolCurve3poolPricer',
        neuronPool: 'NeuronPoolCurve3pool',
    },
    {
        name: 'NeuronPoolCurveFraxPricer',
        neuronPool: 'NeuronPoolCurveFrax',
    },
    {
        name: 'NeuronPoolCurveLUSDPricer',
        neuronPool: 'NeuronPoolCurveLUSD',
    },
    {
        name: 'NeuronPoolCurveALUSDPricer',
        neuronPool: 'NeuronPoolCurveALUSD',
    },
    {
        name: 'NeuronPoolCurveMIMPricer',
        neuronPool: 'NeuronPoolCurveMIM',
    },
    {
        name: 'NeuronPoolCurveUSDPPricer',
        neuronPool: 'NeuronPoolCurveUSDP',
    },
    {
        name: 'NeuronPoolCurveMIMUSTPricer',
        neuronPool: 'NeuronPoolCurveMIMUST',
    },
];

describe('NeuronPoolPricers', () => {
    for (const config of configs) {
        testNeuronPoolPricers(config);
    }
});


function testNeuronPoolPricers(config: IConfig) {
    describe(`${config.name}`, () => {
        // --------------------------------------------------------
        // ----------------------  DEPLOY  ------------------------
        // --------------------------------------------------------

        let neuronPoolCurvePricer: IPricer;
        let user: Signer;

        beforeEach(async () => {
            await NetworkHelper.reset();
            await deployments.fixture([config.name]);
            const NeuronPoolCurvePricerDeployment = await deployments.get(config.name);
            const accounts = await ethers.getSigners();
            user = accounts[10];
            neuronPoolCurvePricer = await ethers.getContractAt(
                'IPricer',
                NeuronPoolCurvePricerDeployment.address
            ) as IPricer;

            const NeuronPoolCurveDeployment = await deployments.get(config.neuronPool);
            const neuronPoolCurve = await ethers.getContractAt('INeuronPool', NeuronPoolCurveDeployment.address) as INeuronPool;
            const tokenAddress = await neuronPoolCurve.token();
            await TokenHelper.createTokens(tokenAddress, user);
            const token = await TokenHelper.getToken(tokenAddress);
            const tokenBalance = await token.balanceOf(await user.getAddress());
            await token.connect(user).approve(neuronPoolCurve.address, tokenBalance);
            await neuronPoolCurve.connect(user).deposit(await neuronPoolCurve.token(), tokenBalance);
        });

        // --------------------------------------------------------
        // ------------------  REGULAR TESTS  ---------------------
        // --------------------------------------------------------

        it(`Regular test`, async () => {
            const price = await neuronPoolCurvePricer.getPrice();
            console.log(`PRICE: ${price}`);
            assert(price.lt(ethers.utils.parseEther('1.1')), `Price more 1.1, = ${ethers.utils.formatEther(price)}`);
            assert(price.gt(ethers.utils.parseEther('0.9')), `Price low 0.9 = ${ethers.utils.formatEther(price)}`);
        });
    });
}