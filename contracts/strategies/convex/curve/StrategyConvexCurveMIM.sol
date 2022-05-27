// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "../StrategyConvexFarmBase.sol";
import "../../../interfaces/ICurve.sol";
import "../../../interfaces/IConvexFarm.sol";

contract StrategyConvexCurveMIM is StrategyConvexFarmBase {
    using SafeERC20 for IERC20;
    using Address for address;

    address public constant MIM = 0x99D8a9C45b2ecA8864373A26D1459e3Dff1e17F3;
    address public constant CRV3 = 0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490;
    address public constant SPELL = 0x090185f2135308BaD17527004364eBcC2D37e5F6;

    constructor(
        address _governance,
        address _strategist,
        address _controller,
        address _neuronTokenAddress,
        address _timelock
    )
        StrategyConvexFarmBase(
            0x5a6A4D54456819380173272A5E8E9B9904BdF41B, //mim3crv
            0x5a6A4D54456819380173272A5E8E9B9904BdF41B, //curvePool
            40, // convexPoolId
            _governance,
            _strategist,
            _controller,
            _neuronTokenAddress,
            _timelock
        )
    {}

    function getName() external pure override returns (string memory) {
        return "StrategyConvexCurveMim";
    }

    function harvest() public override onlyBenevolent {
        IBaseRewardPool(getCrvRewardContract()).getReward(address(this), true);

        // Check rewards
        uint256 _cvx = IERC20(cvx).balanceOf(address(this));
        uint256 _crv = IERC20(crv).balanceOf(address(this));
        uint256 _spell = IERC20(SPELL).balanceOf(address(this));

        // Swap cvx to crv
        if (_cvx > 0) {
            IERC20(cvx).safeApprove(sushiRouter, 0);
            IERC20(cvx).safeApprove(sushiRouter, _cvx);
            _swapSushiswap(cvx, crv, _cvx);
        }

        // Swap fxs to crv
        if (_spell > 0) {
            IERC20(SPELL).safeApprove(sushiRouter, 0);
            IERC20(SPELL).safeApprove(sushiRouter, _spell);
            _swapSushiswap(SPELL, crv, _spell);
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
