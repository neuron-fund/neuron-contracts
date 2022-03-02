// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "./StrategyConvexFarmBase.sol";

contract StrategyConvex3PoolLp is StrategyConvexFarmBase {
    using SafeERC20 for IERC20;
    using Address for address;
    using SafeMath for uint256;
    
    uint256 public constant treePoolCrvId = 9;
    address public constant lp = 0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490;
    address public constant token = 0x30D9410ED1D5DA1F6C8391af5338C93ab8d4035C;

    constructor(
        address _governance,
        address _strategist,
        address _controller,
        address _neuronTokenAddress,
        address _timelock
    )
        StrategyConvexFarmBase(
            token,
            treePoolCrvId,
            lp,
            _governance,
            _strategist,
            _controller,
            _neuronTokenAddress,
            _timelock
        )
    {}

    function getName() external pure override returns (string memory) {
        return "StrategyConvex3PoolLp";
    }

    function harvest() public override {
        IBaseRewardPool(getCrvRewardContract()).getReward(address(this), true);

        uint256 _cvx = IERC20(cvx).balanceOf(address(this));

        if (_cvx > 0) {
            IERC20(cvx).safeApprove(sushiRouter, 0);
            IERC20(cvx).safeApprove(sushiRouter, _cvx);
            _swapSushiswap(cvx, crv, _cvx);
        }
        uint256 _crv = IERC20(crv).balanceOf(address(this));

        if (_crv > 0) {
            uint256[2] memory amounts = [_crv, 0];
            IERC20(crv).safeApprove(lp, 0);
            IERC20(crv).safeApprove(lp, _crv);
            ICurveFi_4(lp).add_liquidity(amounts, 0);
        }

        deposit();
    }
}
