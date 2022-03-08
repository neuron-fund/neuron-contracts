// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "../StrategyConvexFarmBase.sol";
import "../../../interfaces/ICurve.sol";

contract StrategyConvexCurve3Lp is StrategyConvexFarmBase {
    using SafeERC20 for IERC20;
    using Address for address;

    // Convex pool data
    uint256 public constant threeLpPoolId = 9;
    address public constant threeCrv =
        0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490;
    address public constant threePool =
        0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;

    // stablecoins
    address public constant dai = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address public constant usdc = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant usdt = 0xdAC17F958D2ee523a2206206994597C13D831ec7;

    constructor(
        address _governance,
        address _strategist,
        address _controller,
        address _neuronTokenAddress,
        address _timelock
    )
        StrategyConvexFarmBase(
            threeCrv,
            _governance,
            _strategist,
            _controller,
            _neuronTokenAddress,
            _timelock,
            threeLpPoolId
        )
    {}

    function getName() external pure override returns (string memory) {
        return "StrategyConvexCurve3Lp";
    }

    function harvest() public override onlyBenevolent {
        IBaseRewardPool(getCrvRewardContract()).getReward(address(this), true);
        uint256 _cvx = IERC20(cvx).balanceOf(address(this));
        if (_cvx > 0) {
            IERC20(cvx).safeApprove(sushiRouter, 0);
            IERC20(cvx).safeApprove(sushiRouter, _cvx);
            _swapSushiswap(cvx, crv, _cvx);
        }

        (address to, uint256 toIndex) = getMostPremium();
        uint256 _crv = IERC20(crv).balanceOf(address(this));
        if (_crv > 0) {
            _swapToNeurAndDistributePerformanceFees(crv, sushiRouter);
        }
        _crv = IERC20(crv).balanceOf(address(this));
        if (_crv > 0) {
            _swapUniswap(crv, to, _crv);
        }
        // Adds liquidity to curve.fi's pool
        // to get back want (scrv)
        uint256 _to = IERC20(to).balanceOf(address(this));
        if (_to > 0) {
            IERC20(to).safeApprove(threePool, 0);
            IERC20(to).safeApprove(threePool, _to);
            uint256[3] memory liquidity;
            liquidity[toIndex] = _to;
            // Transferring stablecoins back to Curve
            ICurveFi_3(threePool).add_liquidity(liquidity, 0);
        }
        deposit();
    }

    function getMostPremium() internal view returns (address, uint256) {
        ICurveFi_3 curve = ICurveFi_3(threePool);
        uint256[3] memory balances = [
            curve.balances(0), // DAI
            curve.balances(1) * (10**12), // USDC
            curve.balances(2) * (10**12) // USDT
        ];

        // USDC
        if (balances[1] < balances[0] && balances[1] < balances[2]) {
            return (usdc, 1);
        }

        // USDT
        if (balances[2] < balances[0] && balances[2] < balances[1]) {
            return (usdt, 2);
        }

        // If they're somehow equal, we just want DAI
        return (dai, 0);
    }
}
