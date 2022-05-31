import { ethers, deployments, network } from 'hardhat';
import { assert } from 'chai';
import { INeuronPool, IERC20, IConvexBooster, StrategyConvexFarmBase, IUniswapRouterV2, ICurveFi } from '../typechain-types';
import { CONVEX_BOOSTER, CRV, CVX, DAI, FXS, SPELL, UNISWAP_ROUTER_V2, WETH } from '../constants/addresses';
import { waitNDays } from '../utils/time';
import { get3Crv } from '../utils/getCurveTokens';
import ERC20Minter from './helpers/ERC20Minter';

interface IConfig {
    startegy: string;
    neuronPool: string;
    buildBalanceSlot: (recipientAddress: string) => [string | number, string | number];

}

const CONFIGS: IConfig[] = [
    // {
    //     startegy: 'StrategyConvexCurve3Pool',
    //     neuronPool: 'NeuronPoolCurve3pool',
    //     buildBalanceSlot: (recipient) => [3, recipient],
    // },
    {
        startegy: 'StrategyConvexCurveFrax',
        neuronPool: 'NeuronPoolCurveFrax',
        buildBalanceSlot: (recipient) => [15, recipient],
    },
    // {
    //     startegy: 'StrategyConvexCurveMIM',
    //     neuronPool: 'NeuronPoolCurveMIM',
    //     buildBalanceSlot: (recipient) => [15, recipient],
    // },
]


describe('Strategies tests', () => {
    for(const CONFIG of CONFIGS) {
        startegyTests(CONFIG);
    }
});

function startegyTests(CONFIG: IConfig) {
    describe(`${CONFIG.startegy}`, () => {
        it('Regular test', async () => {
            const accounts = await ethers.getSigners();
            const user = accounts[9];
    
            await deployments.fixture([CONFIG.startegy, CONFIG.neuronPool]);
            const StartegyDeployment = await deployments.get(CONFIG.startegy);
            console.log(`StartegyDeployment ${StartegyDeployment.address}`)
            const NeuronPoolDeployment = await deployments.get(CONFIG.neuronPool);
    
            const strategy = await ethers.getContractAt('StrategyConvexFarmBase', StartegyDeployment.address) as StrategyConvexFarmBase;
            const neuronPool = await ethers.getContractAt('INeuronPool', NeuronPoolDeployment.address) as INeuronPool;
    
            const wantToken = await ethers.getContractAt('@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20', await strategy.want()) as IERC20;
            await ERC20Minter.mint(CONFIG.buildBalanceSlot(await user.getAddress()), wantToken.address, ethers.utils.parseEther("10"));

            const wantTokenBalance = await wantToken.balanceOf(await user.getAddress());
            console.log(`wantToken ${wantToken.address}`)
            console.log(`wantTokenBalance ${wantTokenBalance}`)

            await wantToken.connect(user).approve(neuronPool.address, wantTokenBalance);
            await neuronPool.connect(user).deposit(wantToken.address, wantTokenBalance);
            console.log(`neuronPool balance: ${await wantToken.balanceOf(neuronPool.address)}`);
            const earnTransaction = await neuronPool.earn();
            console.log(`events deposit: ${JSON.stringify((await earnTransaction.wait()).events, null, 4)}`)
            await waitNDays(7 * 12, network.provider);

            const startegyBalance = await strategy.balanceOfPool();
            console.log(`startegyBalance ${startegyBalance}`)
            assert(startegyBalance.gt(0), 'Not deposited');

            const booster = await ethers.getContractAt('IConvexBooster', CONVEX_BOOSTER, accounts[10]) as IConvexBooster;
            await booster.earmarkRewards(await strategy.convexPoolId());
            const transaction = await strategy.harvest();

            (await transaction.wait()).events.filter(event => event.event == 'RewardToken').forEach(event => {
                if(!event.args[1].gt(0)) console.log(`Not rewarded token ${event.args[0]}`);
                assert(event.args[1].gt(0), `Not rewarded token ${event.args[0]}`);
            });

            console.log(`preresultBalance ${await wantToken.balanceOf(await user.getAddress())}`);
            await neuronPool.connect(user).withdrawAll(wantToken.address);
            const resultBalance = await wantToken.balanceOf(await user.getAddress());

            console.log(`resultBalance ${resultBalance}`);

            assert(resultBalance.gt(wantTokenBalance), 'Tokens not farmed');
        });
    });
}