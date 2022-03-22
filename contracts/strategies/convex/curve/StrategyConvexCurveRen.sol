// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "../StrategyConvexFarmBase.sol";
import "../../../interfaces/ICurve.sol";
import "../../../interfaces/IConvexFarm.sol";

contract StrategyConvexCurveRen is StrategyConvexFarmBase {
    using SafeERC20 for IERC20;
    using Address for address;

    // btc tokens
    address public constant renBtc = 0xEB4C2781e4ebA804CE9a9803C67d0893436bB27D;
    address public constant wBtc = 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599;

    event CvxHarvested(uint256 amout);
    event CrvHarvested(uint256 amout);

    constructor(
        address _governance,
        address _strategist,
        address _controller,
        address _neuronTokenAddress,
        address _timelock
    )
        StrategyConvexFarmBase(
            0x49849C98ae39Fff122806C06791Fa73784FB3675, // want
            0x93054188d876f558f4a66B2EF1d97d16eDf0895B, // curvePool
            6, // convexPoolId
            _governance,
            _strategist,
            _controller,
            _neuronTokenAddress,
            _timelock
        )
    {}

    function getName() external pure override returns (string memory) {
        return "StrategyConvexCurveRen";
    }

    function harvest() public override onlyBenevolent {
        IBaseRewardPool(getCrvRewardContract()).getReward(address(this), true);

        // Check rewards
        uint256 _cvx = IERC20(cvx).balanceOf(address(this));
        emit CvxHarvested(_cvx);

        uint256 _crv = IERC20(crv).balanceOf(address(this));
        emit CrvHarvested(_crv);

        // Swap cvx to crv
        if (_cvx > 0) {
            IERC20(cvx).safeApprove(sushiRouter, 0);
            IERC20(cvx).safeApprove(sushiRouter, _cvx);
            _swapSushiswap(cvx, crv, _cvx);
        }

        // Swap crv to stable coins
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
            uint256[2] memory liquidity;
            liquidity[toIndex] = _to;
            ICurveFi_2(curvePool).add_liquidity(liquidity, 0);
        }
        deposit();
    }

    function getMostPremium() internal view returns (address, uint256) {
        ICurveFi_2 curve = ICurveFi_2(curvePool);
        uint256[2] memory balances = [
            curve.balances(0), // renBtc
            curve.balances(1) // wBtc
        ];

        // renBtc
        if (balances[0] < balances[1]) {
            return (renBtc, 0);
        }

        // wBtc
        return (wBtc, 1);
    }
}
