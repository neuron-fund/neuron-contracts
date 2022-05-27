// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import {StrategyBase} from "./StrategyBase.sol";
import {IStabilityPool} from "../interfaces/IStabilityPool.sol";
import {ITroveManager} from "../interfaces/ITroveManager.sol";
import {ILiquityPriceFeed} from "../interfaces/ILiquityPriceFeed.sol";
import {ISortedTroves} from "../interfaces/ISortedTroves.sol";

contract StrategyStabilityPoolLUSD is StrategyBase {
    address public constant LUSD = 0x5f98805A4E8be255a32880FDeC7F6728C6568bA0;
    address payable public constant STABILITY_POOL = payable(0x66017D22b0f8556afDd19FC67041899Eb65a21bb);

    constructor(
        address _want,
        address _governance,
        address _strategist,
        address _controller,
        address _neuronTokenAddress,
        address _timelock
    ) StrategyBase(_want, _governance, _strategist, _controller, _neuronTokenAddress, _timelock) {}

    function balanceOfPool() public view override returns (uint256 balance_) {
        (balance_, ) = IStabilityPool(STABILITY_POOL).deposits(address(this));
    }

    function getName() external pure override returns (string memory) {
        return "StrategyStabilityPoolLUSD";
    }

    function deposit() public override {}

    function needLiquidateTrove() internal returns (bool) {
        IStabilityPool stabilityPool = IStabilityPool(STABILITY_POOL);
        address lowestTrove = ISortedTroves(stabilityPool.sortedTroves()).getLast();
        uint256 price = ILiquityPriceFeed(stabilityPool.priceFeed()).fetchPrice();

        return ITroveManager(stabilityPool.troveManager()).getCurrentICR(lowestTrove, price) < 1100000000000000000;
    }

    function _withdrawSome(uint256 _amount) internal override returns (uint256) {
        if(needLiquidateTrove()) {
            
        }
        IStabilityPool(STABILITY_POOL).withdrawFromSP(_amount);
        // return
    }

    function harvest() public override {}
}
