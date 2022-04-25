import { ethers, network, deployments } from 'hardhat';
import { Contract, Signer } from 'ethers';
import { assert } from 'chai';
import { expectRevert } from '@openzeppelin/test-helpers';
import { IERC20, IERC20__factory, IUniswapRouterV2, NeuronPoolBase, NeuronPoolCurvePricer } from '../typechain-types';
import { UNISWAP_ROUTER_V2, WETH } from '../constants/addresses';


describe(`NeuronPoolPricer.sol`, () => {
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

    let neuronPoolCurvePricer: NeuronPoolCurvePricer;
    let user: Signer;

    beforeEach(async () => {
        await deployments.fixture(['NeuronPoolCurvePricer']);
        const NeuronPoolCurvePricerDeployment = await deployments.get('NeuronPoolCurvePricer');
        const accounts = await ethers.getSigners();
        user = accounts[10];
        neuronPoolCurvePricer = await _getContract('NeuronPoolCurvePricer', NeuronPoolCurvePricerDeployment.address);
    });

    // --------------------------------------------------------
    // ------------------  REGULAR TESTS  ---------------------
    // --------------------------------------------------------

    it(`Regular test`, async () => {
        const price = await neuronPoolCurvePricer.getPrice();
        console.log(`PRICE: ${price}`);
        console.log(`PRICE: ${ethers.utils.formatEther(price)}`);
    });
});

// --------------------------------------------------------
// -----------------  GLOBAL HELPERS  ---------------------
// --------------------------------------------------------

async function _getToken(address: string, signer?: Signer): Promise<IERC20> {
    return await _getContract('@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20', address, signer) as IERC20;
}

async function _getContract<T extends Contract>(contract: string, address: string, deployer?: Signer): Promise<T> {
    return await ethers.getContractAt(contract, address) as T;
}


async function impersonateAccount(acctAddress) {
    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [acctAddress],
    });
    return await ethers.getSigner(acctAddress);
}