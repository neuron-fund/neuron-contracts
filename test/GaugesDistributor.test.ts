import { ethers, deployments, network } from 'hardhat';
import { BigNumber, Signer } from 'ethers';
import { assert } from 'chai';
import { GaugeImplementation, GaugesDistributor, INeuronPool, IPricer, IUniswapRouterV2, NeuronPoolBase, NeuronToken, IERC20 } from '../typechain-types';
import NetworkHelper from './helpers/NetworkHelper';
import { expectRevert } from '@openzeppelin/test-helpers';
import TokenHelper from './helpers/TokenHelper';
import { CRV3, UNISWAP_ROUTER_V2, WETH } from '../constants/addresses';


describe('GaugesDistributor.sol', () => {
    let donor: Signer;
    let users: Signer[];

    let gaugesDistributor: GaugesDistributor;
    let neuronToken: NeuronToken;
    let firstGauge: GaugeImplementation;
    let neuronPool: INeuronPool;
    let neuronPoolToken: IERC20;
    let donorNeuronPoolBalance: BigNumber;

    beforeEach(async () => {
        await NetworkHelper.reset();

        const accounts = await ethers.getSigners();
        donor = accounts[9];
        users = [accounts[10], accounts[11], accounts[12]];

        await deployments.fixture(['GaugesDistributor', 'NeuronPoolCurve3pool', 'GaugeImplementation', 'NeuronToken']);

        const GaugesDistributorDeployment = await deployments.get('GaugesDistributor');
        const GaugeImplementationDeployment = await deployments.get('GaugeImplementation');
        const NeuronPoolCurve3poolDeployment = await deployments.get('NeuronPoolCurve3pool');
        const NeuroTokenDeployment = await deployments.get('NeuronToken');

        neuronToken = await ethers.getContractAt('NeuronToken', NeuroTokenDeployment.address) as NeuronToken;

        gaugesDistributor = await ethers.getContractAt('GaugesDistributor', GaugesDistributorDeployment.address) as GaugesDistributor;
        await gaugesDistributor.addGauge(NeuronPoolCurve3poolDeployment.address, GaugeImplementationDeployment.address);
        await gaugesDistributor.setWeights([NeuronPoolCurve3poolDeployment.address], [BigNumber.from('100')]);

        const gaugesDistributorTokens = await gaugesDistributor.tokens();

        const firstGaugeAddress = await gaugesDistributor.getGauge(gaugesDistributorTokens[0]);
        firstGauge = await ethers.getContractAt('GaugeImplementation', firstGaugeAddress) as GaugeImplementation;

        neuronPool = await ethers.getContractAt('INeuronPool', NeuronPoolCurve3poolDeployment.address) as INeuronPool;
        neuronPoolToken = await ethers.getContractAt('@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20', await neuronPool.token()) as IERC20;

        const uniswapRouter = await ethers.getContractAt('IUniswapRouterV2', UNISWAP_ROUTER_V2) as IUniswapRouterV2;
        await uniswapRouter.connect(donor).swapExactETHForTokens(
            '0',
            [WETH, CRV3],
            await donor.getAddress(),
            Date.now() + 30000,
            {
                gasLimit: 4000000,
                value: ethers.utils.parseEther('1000'),
            },
        );
        const donor3crvBalance = await neuronPoolToken.balanceOf(await donor.getAddress());
        await neuronPoolToken.connect(donor).approve(neuronPool.address, donor3crvBalance);

        const initialUserNeuronPoolBalance = await neuronPool.balanceOf(await donor.getAddress());;
        await neuronPool.connect(donor).deposit(neuronPoolToken.address, donor3crvBalance);

        donorNeuronPoolBalance = (await neuronPool.balanceOf(await donor.getAddress())).sub(initialUserNeuronPoolBalance);

    });

    async function depositNeuronPool(user: Signer, percent: number): Promise<BigNumber> {
        const amountNeuronPool = donorNeuronPoolBalance.mul(percent).div(100);
        await neuronPool.connect(donor).transfer(await user.getAddress(), amountNeuronPool);
        return amountNeuronPool;
    }

    it(`Distribute: Set duration less min`, async () => {
        const oneDay = 60 * 60 * 24;
        await expectRevert(gaugesDistributor.distribute(oneDay - 1), '!duration');
    });

    it(`Distribute: Set duration more max`, async () => {
        const weeks12 = 60 * 60 * 24 * 7 * 12;
        await expectRevert(gaugesDistributor.distribute(weeks12 + 1), '!duration');
    });

    it(`Distribute: Call with zero balance`, async () => {
        const weeks12 = 60 * 60 * 24 * 7 * 12;
        await expectRevert(gaugesDistributor.distribute(weeks12), '!balance');
    });    

    it(`Distribute: regular test`, async () => {
        const user = users[0];
        const userNeuronPoolBalance = await depositNeuronPool(user, 10);

        await neuronPool.connect(user).approve(firstGauge.address, userNeuronPoolBalance);
        await firstGauge.connect(user).deposit(userNeuronPoolBalance)

        const totalBalance = ethers.utils.parseEther('100');
        await neuronToken.mint(gaugesDistributor.address, totalBalance);

        const week = 60 * 60 * 24 * 7;
        await gaugesDistributor.distribute(week);

        await network.provider.send('evm_increaseTime', [week]);
        await network.provider.send('evm_mine');

        const initialBalance = await neuronToken.balanceOf(await user.getAddress());

        await firstGauge.connect(user).getReward();

        const resultBalance = (await neuronToken.balanceOf(await user.getAddress())).sub(initialBalance);

        const percent = totalBalance.mul(1).div(100000000000000); // 0.000000000001 %
        const topLevel = totalBalance.add(percent);
        const lowLevel = totalBalance.sub(percent);
        assert(resultBalance.gte(lowLevel) && resultBalance.lte(topLevel), `Result balance = ${resultBalance}; topLevel = ${topLevel}, lowLevel = ${lowLevel}`);
    });

    it(`Distribute: 3 users regular test`, async () => {
        const testUsers = users.slice(0, 3);
        for (let i = 0; i < testUsers.length; i++) {
            const user = testUsers[i];
            const userNeuronPoolBalance = await depositNeuronPool(user, 10 * (i + 1));
            await neuronPool.connect(user).approve(firstGauge.address, userNeuronPoolBalance);
            await firstGauge.connect(user).deposit(userNeuronPoolBalance);
        }

        const totalBalance = ethers.utils.parseEther('100');
        await neuronToken.mint(gaugesDistributor.address, totalBalance);

        const week = 60 * 60 * 24 * 7;
        await gaugesDistributor.distribute(week);

        await network.provider.send('evm_increaseTime', [week + 100]);
        await network.provider.send('evm_mine');

        for (let i = 0; i < testUsers.length; i++) {
            const user = testUsers[i];
            await firstGauge.connect(user).getReward();

            const rewardBalance = await neuronToken.balanceOf(await user.getAddress());

            const totalUserBalance = totalBalance.mul(i + 1).div(6);
            const percent = totalUserBalance.mul(1).div(100000000000000); // 0.000000000001 %
            const topLevel = totalUserBalance.add(percent);
            const lowLevel = totalUserBalance.sub(percent);
            assert(rewardBalance.gte(lowLevel) && rewardBalance.lte(topLevel), `Result balance ${i} = ${rewardBalance}; topLevel = ${topLevel}, lowLevel = ${lowLevel}`);
        }
    });

    it(`Distribute: timewindow test`, async () => {
        const user = users[0];
        const userNeuronPoolBalance = await depositNeuronPool(user, 10);

        await neuronPool.connect(user).approve(firstGauge.address, userNeuronPoolBalance);
        await firstGauge.connect(user).deposit(userNeuronPoolBalance)

        const totalBalance = ethers.utils.parseEther('100');
        await neuronToken.mint(gaugesDistributor.address, totalBalance);

        const week = 60 * 60 * 24 * 7;
        await gaugesDistributor.distribute(week);

        await network.provider.send('evm_increaseTime', [week]);
        await network.provider.send('evm_mine');

        const initialBalance = await neuronToken.balanceOf(await user.getAddress());

        await firstGauge.connect(user).getReward();

        const resultBalance = (await neuronToken.balanceOf(await user.getAddress())).sub(initialBalance);

        const percent = totalBalance.mul(1).div(100000000000000); // 0.000000000001 %
        const topLevel = totalBalance.add(percent);
        const lowLevel = totalBalance.sub(percent);
        assert(resultBalance.gte(lowLevel) && resultBalance.lte(topLevel), `Result balance = ${resultBalance}; topLevel = ${topLevel}, lowLevel = ${lowLevel}`);

        await network.provider.send('evm_increaseTime', [week]);
        await network.provider.send('evm_mine');

        await neuronToken.mint(gaugesDistributor.address, totalBalance);
        await gaugesDistributor.distribute(week);

        await network.provider.send('evm_increaseTime', [week]);
        await network.provider.send('evm_mine');

        const initialBalance2 = await neuronToken.balanceOf(await user.getAddress());

        await firstGauge.connect(user).getReward()

        const resultBalance2 = (await neuronToken.balanceOf(await user.getAddress())).sub(initialBalance2);

        assert(resultBalance2.gte(lowLevel) && resultBalance2.lte(topLevel), `Result balance2 = ${resultBalance2}; topLevel = ${topLevel}, lowLevel = ${lowLevel}`);
    });
});