import { ethers, network, upgrades, deployments } from 'hardhat';
import { BigNumber, Contract, Signer } from 'ethers';
import { assert } from 'chai';
import { expectRevert } from '@openzeppelin/test-helpers';
import { Controller__factory, ICurveFi2, IERC20, IERC20__factory, IUniswapRouterV2, IUSDT, MasterChef__factory, NeuronPoolCurveBase, NeuronToken__factory, StrategyConvexCurve3Lp__factory } from '../typechain';
import { UNISWAP_ROUTER_V2, WETH } from '../constants/addresses';
import { parseEther } from 'ethers/lib/utils';

const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const CRV3 = '0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490';
const FRAX = '0x853d955aCEf822Db058eb8505911ED77F175b99e';
const FRAX3CRV = '0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B';
const LUSD3CRV = '0xEd279fDD11cA84bEef15AF5D39BB4d4bEE23F0cA';
const LUSD = '0x5f98805A4E8be255a32880FDeC7F6728C6568bA0';
const ALUSD = '0xBC6DA0FE9aD5f3b0d58160288917AA56653660E9';
const ALUSD3CRV = '0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c';
const CYDAI = '0x8e595470Ed749b85C6F7669de83EAe304C2ec68F';
const CYUSDC = '0x76Eb2FE28b36B3ee97F3Adae0C69606eeDB2A37c';
const CYUSDT = '0x48759F220ED983dB51fA7A8C0D2AAb8f3ce4166a';
const IB3CRV = '0x5282a4eF67D9C33135340fB3289cc1711c13638C';
const USDP3CRV = '0x7Eb40E450b9655f4B3cC4259BCC731c63ff55ae6';
const USDP = '0x1456688345527bE1f37E9e627DA0837D6f08C925';
const MIM = '0x99D8a9C45b2ecA8864373A26D1459e3Dff1e17F3';
const UST = '0xa47c8bf37f92aBed4A126BDA807A7b7498661acD';
const MIMUST = '0x55A8a39bc9694714E2874c1ce77aa1E599461E18';
const MIM3CRV = '0x5a6A4D54456819380173272A5E8E9B9904BdF41B';



interface Config {
    name: string;
    contract: string;
    tokens: string[];
    errorToken: string;
}

const configs: Config[] = [
    {
        name: 'NeuronPoolCurve3pool',
        contract: 'NeuronPoolCurve3pool',
        tokens: [
            CRV3,
            DAI,
            USDC,
            USDT,
        ],
        errorToken: FRAX3CRV,
    },
    {
        name: 'NeuronPoolCurveFrax',
        contract: 'NeuronPoolCurve3crvExtends',
        tokens: [
            FRAX3CRV,
            FRAX,
            CRV3,
            DAI,
            USDC,
            USDT,
        ],
        errorToken: LUSD3CRV,
    },
    {
        name: 'NeuronPoolCurveLUSD',
        contract: 'NeuronPoolCurve3crvExtends',
        tokens: [
            LUSD3CRV,
            LUSD,
            CRV3,
            DAI,
            USDC,
            USDT,
        ],
        errorToken: FRAX3CRV,
    },
    {
        name: 'NeuronPoolCurveALUSD',
        contract: 'NeuronPoolCurve3crvExtends',
        tokens: [
            ALUSD3CRV,
            ALUSD,
            CRV3,
            DAI,
            USDC,
            USDT,
        ],
        errorToken: FRAX3CRV,
    }, 
    {
        name: 'NeuronPoolCurveMIM',
        contract: 'NeuronPoolCurve3crvExtends',
        tokens: [
            MIM3CRV,
            MIM,
            CRV3,
            DAI,
            USDC,
            USDT,
        ],
        errorToken: FRAX3CRV,
    },    
    {
        name: 'NeuronPoolCurveIronBank',
        contract: 'NeuronPoolCurveIronBank',
        tokens: [
            IB3CRV,
            CYDAI,
            CYUSDC,
            CYUSDT,
            DAI,
            USDC,
            USDT,
        ],
        errorToken: FRAX3CRV,
    },
    {
        name: 'NeuronPoolCurveUSDP',
        contract: 'NeuronPoolCurve3crvExtends',
        tokens: [
            USDP3CRV,
            USDP,
            CRV3,
            DAI,
            USDC,
            USDT,
        ],
        errorToken: FRAX3CRV,
    },
    {
        name: 'NeuronPoolCurveMIMUST',
        contract: 'NeuronPoolCurveMIMUST',
        tokens: [
            MIMUST,
            MIM,
            UST,
        ],
        errorToken: FRAX3CRV,
    },
];

describe('NeuronPools', () => {
    for (const config of configs) {
        testNeuronPool(config);
    }
});

function testNeuronPool(config: Config) {

    describe(`NeuronPool.sol ${config.name}`, () => {
        // --------------------------------------------------------
        // ----------------------  RESET  -------------------------
        // --------------------------------------------------------

        let initialBlockNumber: number;
        beforeEach(async () => {
            if (initialBlockNumber === undefined) initialBlockNumber = await ethers.provider.getBlockNumber();
            else await network.provider.request({
                method: "hardhat_reset",
                params: [{
                    forking: {
                        jsonRpcUrl: process.env.POLYGON ? process.env.ALCHEMY_POLYGON : process.env.ALCHEMY,
                        blockNumber: initialBlockNumber
                    }
                }]
            });
        });


        // --------------------------------------------------------
        // ----------------------  DEPLOY  ------------------------
        // --------------------------------------------------------

        let neuronPool: NeuronPoolCurveBase;
        let user: Signer;

        beforeEach(async () => {
            await deployments.fixture([config.name]);
            const NeuronPoolDeployment = await deployments.get(config.name);
            const accounts = await ethers.getSigners();
            user = accounts[10];
            neuronPool = await _getContract(config.contract, NeuronPoolDeployment.address);
        });

        // --------------------------------------------------------
        // ------------------  REGULAR TESTS  ---------------------
        // --------------------------------------------------------

        // it('Regular test tokens')
        for (let i = 0; i < config.tokens.length; i++) {
            const tokenAddress = config.tokens[i];
            it(`Regular test: deposit and withdraw tokens (index = ${i}; address = ${tokenAddress})`, async () => {
                const token = await _getToken(tokenAddress, user);
                await _createTokens(tokenAddress, user);
                const tokenBalance = await token.balanceOf(await user.getAddress());

                const initialNeuronTokensBalance = await neuronPool.balanceOf(await user.getAddress());
                await token.connect(user).approve(neuronPool.address, tokenBalance);
                await neuronPool.connect(user).deposit(tokenAddress, tokenBalance);
                const resultNeuronTokensBalance = await neuronPool.balanceOf(await user.getAddress());
                const neuronTokensBalance = resultNeuronTokensBalance.sub(initialNeuronTokensBalance);
                
                assert(
                    neuronTokensBalance.gt(0),
                    `Neuron tokens not minted. Token index = ${i}; Token address = ${tokenAddress}`,
                );

                const initialTokenBalance = await token.balanceOf(await user.getAddress());
                await neuronPool.connect(user).withdraw(tokenAddress, neuronTokensBalance);
                const resultTokenBalance = await token.balanceOf(await user.getAddress());

                assert(
                    resultTokenBalance.gt(initialTokenBalance),
                    `Tokens not withdrawn. Token index = ${i}; Token address = ${tokenAddress}`,
                );
            });
        }


        // --------------------------------------------------------
        // -------------------  SAFETY TESTS  ---------------------
        // --------------------------------------------------------

        it(`SAFETY test: deposit unregistred token (address = ${config.errorToken})`, async () => {
            const tokenAddress = config.errorToken;
            const token = await _getToken(tokenAddress, user);
            await _createTokens(tokenAddress, user);
            const tokenBalance = await token.balanceOf(await user.getAddress());

            await token.connect(user).approve(neuronPool.address, tokenBalance);
            await expectRevert(neuronPool.connect(user).deposit(tokenAddress, tokenBalance), '!token');
        });

        it(`SAFETY test: withdraw unregistred token (address = ${config.errorToken})`, async () => {
            // deposit before test
            const depositTokenAddress = config.tokens[0];
            const token = await _getToken(depositTokenAddress, user);
            await _createTokens(depositTokenAddress, user);
            const tokenBalance = await token.balanceOf(await user.getAddress());

            const initialNeuronTokensBalance = await neuronPool.balanceOf(await user.getAddress());
            await token.connect(user).approve(neuronPool.address, tokenBalance);
            await neuronPool.connect(user).deposit(depositTokenAddress, tokenBalance);
            const resultNeuronTokensBalance = await neuronPool.balanceOf(await user.getAddress());
            const neuronTokensBalance = resultNeuronTokensBalance.sub(initialNeuronTokensBalance);
            
            assert(
                neuronTokensBalance.gt(0),
                `SAFETY test withdraw: Neuron tokens not minted. Deposit token index = ${0}; Token address = ${depositTokenAddress}`,
            );

            // test
            const tokenAddress = config.errorToken;
            await expectRevert(neuronPool.connect(user).withdraw(tokenAddress, neuronTokensBalance), '!token');
        });
    });
}


// --------------------------------------------------------
// -----------------  GLOBAL HELPERS  ---------------------
// --------------------------------------------------------

async function _getToken(address: string, signer?: Signer): Promise<IERC20> {
    return await _getContract('@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20', address, signer) as IERC20;
}

async function _getContract<T extends Contract>(contract: string, address: string, deployer?: Signer): Promise<T> {
    return await ethers.getContractAt(contract, address) as T;
}

async function _createTokens(token: string, recipient: Signer) {
    const canUniswapTokens = {
        [DAI]: true,
        [USDC]: true,
        [USDT]: true,
        [CRV3]: true,
        [FRAX]: true,
        [LUSD]: true,
        [USDP]: true,
        [MIM]: true,
        [UST]: true,
    };
    const erc20token = await _getToken(token);
    const initialBalance = await erc20token.balanceOf(await recipient.getAddress());
    if (canUniswapTokens[token]) {
        const uniswapRouter: IUniswapRouterV2 = await _getContract('IUniswapRouterV2', UNISWAP_ROUTER_V2);

        await uniswapRouter.swapExactETHForTokens(
            '0',
            [WETH, token],
            await recipient.getAddress(),
            Date.now() + 30000,
            {
                gasLimit: 4000000,
                value: ethers.utils.parseEther("500"),
            },
        );
    } else {
        // INITIAL BLOCK NUMBER = 14560420
        const holders = {
            [FRAX3CRV]: '0x47bc10781e8f71c0e7cf97b0a5a88f4cfff21309',
            [LUSD3CRV]: '0xc64844d9b3db280a6e46c1431e2229cd62dd2d69',
            [ALUSD3CRV]: '0x613d9871c25721e8f90acf8cc4341bb145f29c23',
            [ALUSD]: '0x50acc1281845be0ac6936b4d7ad6a14ae613c1c9',
            [IB3CRV]: '0xd4dfbde97c93e56d1e41325bb428c18299db203f',
            [CYDAI]: '0x76871399f5a0756a2f886d316548bd5b1ba648c8',  //12841707758819
            [CYUSDC]: '0x2b19fde5d7377b48be50a5d0a78398a496e8b15c', //37370791287966272
            [CYUSDT]: '0x08d49c032f268d3ac4265d1909c28dfaab440040', //9558343770152895
            [USDP3CRV]: '0x44bc6e3a8384979df6673ac81066c67c83d6d6b2',
            [MIMUST]: '0xcd468d6421a6c5109d6c29698548b2af46a5e21b',
            [MIM3CRV]: '0xe896e539e557bc751860a7763c8dd589af1698ce',
        }

        const holderAddress = holders[token];

        if (holderAddress) {
            const holder = await impersonateAccount(holderAddress);
            await recipient.sendTransaction({
                to: holderAddress,
                value: ethers.utils.parseEther('1'),
            });
            const holdedToken = IERC20__factory.connect(token, holder);
            // assert(false, `${await holdedToken.balanceOf(holderAddress)}`)
            await holdedToken.transfer(await recipient.getAddress(), await holdedToken.balanceOf(holderAddress));
        }
    }
    const balance = (await erc20token.balanceOf(await recipient.getAddress())).sub(initialBalance);
    assert(balance.gt(0), `Fail _createTokens ${token}`);
}


async function impersonateAccount(acctAddress) {
    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [acctAddress],
    });
    return await ethers.getSigner(acctAddress);
}