// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "../StrategyConvexFarmBase.sol";
import "../../../interfaces/ICurve.sol";
import "../../../interfaces/IConvexFarm.sol";

contract StrategyConvexCurveFrax is StrategyConvexFarmBase {
    using SafeERC20 for IERC20;
    using Address for address;

    address public constant FRAX = 0x853d955aCEf822Db058eb8505911ED77F175b99e;
    address public constant CRV3 = 0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490;
    address public constant FXS = 0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0;

    constructor(
        address _governance,
        address _strategist,
        address _controller,
        address _neuronTokenAddress,
        address _timelock
    )
        StrategyConvexFarmBase(
            0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B, //frax3crv
            0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B, //curvePool
            32, // convexPoolId
            _governance,
            _strategist,
            _controller,
            _neuronTokenAddress,
            _timelock
        )
    {}

    function getName() external pure override returns (string memory) {
        return "StrategyConvexCurveFrax";
    }

    function harvest() public override onlyBenevolent {
        IBaseRewardPool(getCrvRewardContract()).getReward(address(this), true);

        // Check rewards
        uint256 _cvx = IERC20(cvx).balanceOf(address(this));
        uint256 _crv = IERC20(crv).balanceOf(address(this));
        uint256 _fxs = IERC20(FXS).balanceOf(address(this));

        // Swap cvx to crv
        if (_cvx > 0) {
            IERC20(cvx).safeApprove(sushiRouter, 0);
            IERC20(cvx).safeApprove(sushiRouter, _cvx);
            _swapSushiswap(cvx, crv, _cvx);
        }

        // Swap fxs to crv
        if (_fxs > 0) {
            IERC20(FXS).safeApprove(sushiRouter, 0);
            IERC20(FXS).safeApprove(sushiRouter, _fxs);
            _swapSushiswap(FXS, crv, _fxs);
        }

        _crv = IERC20(crv).balanceOf(address(this));

        if (_crv > 0) {
            _swapToNeurAndDistributePerformanceFees(crv, sushiRouter);
        }

        _crv = IERC20(crv).balanceOf(address(this));

        if (_crv > 0) {
            IERC20(crv).safeApprove(curvePool, 0);
            IERC20(crv).safeApprove(curvePool, _crv);
            uint256[2] memory liquidity;
            liquidity[1] = _crv;
            ICurveFi_2(curvePool).add_liquidity(liquidity, 0);
        }
        deposit();
    }
}
