// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "../StrategyConvexFarmBase.sol";
import "../../../interfaces/ICurve.sol";
import "../../../interfaces/IConvexFarm.sol";

contract StrategyConvexCurveCrvEth is StrategyConvexFarmBase {
    using SafeERC20 for IERC20;
    using Address for address;

    constructor(
        address _governance,
        address _strategist,
        address _controller,
        address _neuronTokenAddress,
        address _timelock
    )
        StrategyConvexFarmBase(
            0xEd4064f376cB8d68F770FB1Ff088a3d0F3FF5c4d, // want
            0x8301AE4fc9c624d1D396cbDAa1ed877821D7C511, // curvePool
            61, // convexPoolId
            _governance,
            _strategist,
            _controller,
            _neuronTokenAddress,
            _timelock
        )
    {}

    function getName() external pure override returns (string memory) {
        return "StrategyConvexCurveCrvEth";
    }

    function harvest() public override onlyBenevolent {
        IBaseRewardPool(getCrvRewardContract()).getReward(address(this), true);

        // Check rewards
        uint256 _cvx = IERC20(cvx).balanceOf(address(this));
        emit RewardToken(cvx, _cvx);

        uint256 _crv = IERC20(crv).balanceOf(address(this));
        emit RewardToken(crv, _crv);

        // Swap cvx to crv
        if (_cvx > 0) {
            IERC20(cvx).safeApprove(sushiRouter, 0);
            IERC20(cvx).safeApprove(sushiRouter, _cvx);
            _swapSushiswap(cvx, crv, _cvx);
        }

        // crv fees
        _crv = IERC20(crv).balanceOf(address(this));

        if (_crv > 0) {
            _swapToNeurAndDistributePerformanceFees(crv, sushiRouter);
        }

        // reinvestment
        _crv = IERC20(crv).balanceOf(address(this));
        if (_crv > 0) {
            IERC20(crv).safeApprove(curvePool, 0);
            IERC20(crv).safeApprove(curvePool, _crv);
            ICurveFi_2(curvePool).add_liquidity([0, _crv], 0);
        }
        emit Harvest();
        deposit();
    }
}
