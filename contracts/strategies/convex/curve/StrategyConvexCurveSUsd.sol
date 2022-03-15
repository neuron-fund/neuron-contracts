// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "../StrategyConvexFarmBase.sol";
import "../../../interfaces/ICurve.sol";
import "../../../interfaces/IConvexFarm.sol";

contract StrategyConvexCurveSUSD is StrategyConvexFarmBase {
    using SafeERC20 for IERC20;
    using Address for address;
    using SafeMath for uint256;

    // stablecoins
    address public constant dai = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address public constant usdc = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant usdt = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant susd = 0x57Ab1ec28D129707052df4dF418D58a2D46d5f51;

    // reward tokens
    address public constant snx = 0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F;

    event CvxHarvested(uint256 amout);
    event CrvHarvested(uint256 amout);
    event SnxHarvested(uint256 amout);

    constructor(
        address _governance,
        address _strategist,
        address _controller,
        address _neuronTokenAddress,
        address _timelock
    )
        StrategyConvexFarmBase(
            0xC25a3A3b969415c80451098fa907EC722572917F, // want
            0xA5407eAE9Ba41422680e2e00537571bcC53efBfD, // curvePool
            4, // convexPoolId
            _governance,
            _strategist,
            _controller,
            _neuronTokenAddress,
            _timelock
        )
    {}

    function getName() external pure override returns (string memory) {
        return "StrategyConvexCurveSUSD";
    }

    function harvest() public override onlyBenevolent {
        IBaseRewardPool(getCrvRewardContract()).getReward(address(this), true);

         // Check rewards
        uint256 _cvx = IERC20(cvx).balanceOf(address(this));
        emit CvxHarvested(_cvx);

        uint256 _crv = IERC20(crv).balanceOf(address(this));
        emit CrvHarvested(_crv);

        uint256 _snx = IERC20(snx).balanceOf(address(this));
        emit SnxHarvested(_snx);

        // Swap cvx to crv
        if (_cvx > 0) {
            IERC20(cvx).safeApprove(sushiRouter, 0);
            IERC20(cvx).safeApprove(sushiRouter, _cvx);
            _swapSushiswap(cvx, crv, _cvx);
        }

        // Swap snx to crv
        if (_snx > 0) {
            IERC20(snx).safeApprove(sushiRouter, 0);
            IERC20(snx).safeApprove(sushiRouter, _snx);
            _swapSushiswap(snx, crv, _snx);
        }

        // Swap crv to stablecoins
        (address to, uint256 toIndex) = getMostPremium();

        _crv = IERC20(crv).balanceOf(address(this));

        if (_crv > 0) {
            _swapToNeurAndDistributePerformanceFees(crv, sushiRouter);
        }

        _crv = IERC20(crv).balanceOf(address(this));

        if (_crv > 0) {
            IERC20(crv).safeApprove(univ2Router2, 0);
            IERC20(crv).safeApprove(univ2Router2, _crv);
            _swapUniswap(crv, to, _crv);
        }

        // reinvestment
        uint256 _to = IERC20(to).balanceOf(address(this));

        if (_to > 0) {
            IERC20(to).safeApprove(curvePool, 0);
            IERC20(to).safeApprove(curvePool, _to);
            uint256[4] memory liquidity;
            liquidity[toIndex] = _to;
            ICurveFi_4(curvePool).add_liquidity(liquidity, 0);
        }
        deposit();
    }

    function getMostPremium() internal view returns (address, uint256) {
        ICurveFi_4 curve = ICurveFi_4(curvePool);
        uint256[4] memory balances = [
            curve.balances(0), // DAI
            curve.balances(1) * (10**12), // USDC
            curve.balances(2) * (10**12), // USDT
            curve.balances(3) // SUSD
        ];

        // USDC
        if (
            balances[1] < balances[0] &&
            balances[1] < balances[2] &&
            balances[1] < balances[3]
        ) {
            return (usdc, 1);
        }

        // USDT
        if (
            balances[2] < balances[0] &&
            balances[2] < balances[1] &&
            balances[2] < balances[3]
        ) {
            return (usdt, 2);
        }

        // SUSD
        if (
            balances[3] < balances[0] &&
            balances[3] < balances[1] &&
            balances[3] < balances[2]
        ) {
            return (susd, 3);
        }

        // If they're somehow equal, we just want DAI
        return (dai, 0);
    }
}
