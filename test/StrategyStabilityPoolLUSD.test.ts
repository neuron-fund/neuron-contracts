import { ethers, deployments, network } from 'hardhat';
import { assert } from 'chai';
import { INeuronPool, IERC20, IConvexBooster, StrategyConvexFarmBase, IUniswapRouterV2, ICurveFi, StrategyStabilityPoolLUSD, IStabilityPool__factory, IStabilityPool, ForceSend } from '../typechain-types';
import { CONVEX_BOOSTER, CRV, CVX, DAI, FXS, LQTY, SPELL, STABILITY_POOL, UNISWAP_ROUTER_V2, WETH } from '../constants/addresses';
import { waitNDays } from '../utils/time';
import { get3Crv } from '../utils/getCurveTokens';
import ERC20Minter from './helpers/ERC20Minter';
import { BigNumber, Signer } from 'ethers';
import NetworkHelper from './helpers/NetworkHelper';
import { ForceSend__factory } from '../typechain-types/factories/contracts/test/ForceSend.sol/ForceSend__factory';

interface IConfig {
    startegy: string;
    neuronPool: string;
    rewardTokens: string[];
}

const CONFIGS: IConfig[] = [
    {
        startegy: 'StrategyStabilityPoolLUSD',
        neuronPool: 'NeuronPoolCurveLUSD',
        rewardTokens: [
            WETH,
            LQTY,
        ]
    },
]


describe('Strategies tests', () => {
    for(const CONFIG of CONFIGS) {
        startegyTests(CONFIG);
    }
});

function startegyTests(CONFIG: IConfig) {
    let initSnapshot: string;
    let user: Signer;
    let strategy: StrategyStabilityPoolLUSD;
    let neuronPool: INeuronPool;
    let wantToken: IERC20;
    let wantTokenBalance: BigNumber;

    describe(`${CONFIG.startegy}`, () => {
        before(async () => {
            const accounts = await ethers.getSigners();
            user = accounts[9];
            await deployments.fixture([CONFIG.startegy, CONFIG.neuronPool]);
            const StartegyDeployment = await deployments.get(CONFIG.startegy);
            const NeuronPoolDeployment = await deployments.get(CONFIG.neuronPool);
    
            strategy = await ethers.getContractAt('StrategyConvexFarmBase', StartegyDeployment.address) as StrategyStabilityPoolLUSD;
            neuronPool = await ethers.getContractAt('INeuronPool', NeuronPoolDeployment.address) as INeuronPool;
            wantToken = await ethers.getContractAt('@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20', await strategy.want()) as IERC20;

            await ERC20Minter.mint(wantToken.address, ethers.utils.parseEther("10"), await user.getAddress());

            wantTokenBalance = await wantToken.balanceOf(await user.getAddress());
            await wantToken.connect(user).approve(neuronPool.address, wantTokenBalance);
            await neuronPool.connect(user).deposit(wantToken.address, wantTokenBalance);
            const earnTransaction = await neuronPool.earn();
            await waitNDays(7 * 12, network.provider);

            const startegyBalance = await strategy.balanceOfPool();
            assert(startegyBalance.gt(0), 'Not deposited');
 
            initSnapshot = await ethers.provider.send('evm_snapshot', []);
        });
        
        afterEach(async () => {
            ethers.provider.send('evm_revert', [initSnapshot]);
        });

        for(const REWARD of CONFIG.rewardTokens) {
            it(`Harvest reward ${REWARD} token test`, async () => {
                const transaction = await strategy.harvest();
                assert((await transaction.wait()).events.filter(event => event.event == 'RewardToken' && event.args[0] == REWARD && event.args[1] > 0).length > 0, `Not rewarded`);
            });
        }

        it(`Withdraw`, async () => {
            await strategy.harvest();
            await neuronPool.connect(user).withdrawAll(wantToken.address);
            const resultBalance = await wantToken.balanceOf(await user.getAddress());

            console.log(`resultBalance ${resultBalance}`);

            assert(resultBalance.gt(wantTokenBalance), 'Tokens not farmed');
        });

        
    });
}