// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "../StrategyConvexFarmBase.sol";
import "../../../interfaces/ICurve.sol";
import "../../../interfaces/IConvexFarm.sol";
import "hardhat/console.sol";
contract StrategyConvexCurveFrax is StrategyConvexFarmBase {
    using SafeERC20 for IERC20;
    using Address for address;

    address public constant FRAX = 0x853d955aCEf822Db058eb8505911ED77F175b99e;
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
        IBaseRewardPool rewardContract = IBaseRewardPool(getCrvRewardContract());
        rewardContract.getReward(address(this), true);
        address[] memory rewardContracts = new address[](0);
        address[] memory extraRewardContracts = new address[](1);
        extraRewardContracts[0] = rewardContract.extraRewards(0);
        address[] memory tokenRewardContracts = new address[](0);
        address[] memory tokenRewardTokens = new address[](0);
        CLAIM_ZAP.claimRewards(rewardContracts, extraRewardContracts, tokenRewardContracts, tokenRewardTokens, 0, 0, 0, 0, 0);

        address self = address(this);
        IERC20 cvxIERC20 = IERC20(cvx);
        IERC20 crvIERC20 = IERC20(crv);
        IERC20 fxsIERC20 = IERC20(FXS);
        IERC20 fraxIERC20 = IERC20(FRAX);

        // Check rewards
        uint256 _cvx = cvxIERC20.balanceOf(self);
        console.log("_cvx", _cvx);
        emit RewardToken(cvx, _cvx);
        
        uint256 _crv = crvIERC20.balanceOf(self);
        console.log("_crv", _crv);
        emit RewardToken(crv, _crv);

        uint256 _fxs = fxsIERC20.balanceOf(self);
        console.log("_fxs", _fxs);
        emit RewardToken(FXS, _fxs);

        // Swap cvx to crv
        if (_cvx > 0) {
            cvxIERC20.safeApprove(sushiRouter, 0);
            cvxIERC20.safeApprove(sushiRouter, _cvx);
            _swapSushiswap(cvx, crv, _cvx);
        }

        // Swap fxs to crv
        if (_fxs > 0) {
            fxsIERC20.safeApprove(sushiRouter, 0);
            fxsIERC20.safeApprove(sushiRouter, _fxs);
            _swapSushiswap(FXS, crv, _fxs);
        }

        _crv = crvIERC20.balanceOf(self);

        if (_crv > 0) {
            _swapToNeurAndDistributePerformanceFees(crv, sushiRouter);
        }

        _crv = crvIERC20.balanceOf(self);

        if(_crv > 0) {
            crvIERC20.safeApprove(univ2Router2, 0);
            crvIERC20.safeApprove(univ2Router2, _crv);
            _swapUniswap(crv, FRAX, _crv);
        }

        uint256 fraxBalance = fraxIERC20.balanceOf(self);

        if (fraxBalance > 0) {
            fraxIERC20.safeApprove(curvePool, 0);
            fraxIERC20.safeApprove(curvePool, fraxBalance);
            uint256[2] memory liquidity;
            liquidity[0] = fraxBalance;
            ICurveFi_2(curvePool).add_liquidity(liquidity, 0);
        }
        emit Harvest();
        deposit();
    }
}
