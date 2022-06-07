pragma solidity 0.8.9;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {ICurveFi_2} from "../../interfaces/ICurve.sol";
import {NeuronPoolBaseInitialize} from "../NeuronPoolBaseInitialize.sol";

contract NeuronPoolCurveDoublePoolExtends is NeuronPoolBaseInitialize {
    using SafeERC20 for IERC20;

    ICurveFi_2 internal basePool;
    IERC20 internal firstTokenInBasePool;
    IERC20 internal secondTokenInBasePool;

     function initialize(
        address _token,
        address _governance,
        address _timelock,
        address _controller,
        address _masterchef,
        address _basePool,
        address _firstTokenInBasePool,
        address _secondTokenInBasePool
    ) external initializer {
        __NeuronPoolBaseInitialize_init(_token, _governance, _timelock, _controller, _masterchef);
        basePool = ICurveFi_2(_basePool);
        firstTokenInBasePool = IERC20(_firstTokenInBasePool);
        secondTokenInBasePool = IERC20(_secondTokenInBasePool);
    }

    function getSupportedTokens() external view override returns (address[] memory tokens) {
        tokens = new address[](3);
        tokens[0] = address(token);
        tokens[1] = address(firstTokenInBasePool);
        tokens[2] = address(secondTokenInBasePool);
    }

    function depositBaseToken(address _enterToken, uint256 _amount) internal override returns (uint256) {
        address self = address(this);
        IERC20 _token = token;
        IERC20 enterToken = IERC20(_enterToken);
        ICurveFi_2 _basePool = basePool;

        uint256[2] memory addLiquidityPayload;
        if (enterToken == firstTokenInBasePool) {
            addLiquidityPayload[0] = _amount;
        } else if (enterToken == secondTokenInBasePool) {
            addLiquidityPayload[1] = _amount;
        } else {
            revert("!token");
        }

        enterToken.safeTransferFrom(msg.sender, self, _amount);
        enterToken.safeApprove(address(_basePool), 0);
        enterToken.safeApprove(address(_basePool), _amount);

        uint256 initialLpTokenBalance = _token.balanceOf(self);

        _basePool.add_liquidity(addLiquidityPayload, 0);

        uint256 resultLpTokenBalance = _token.balanceOf(self);

        require(resultLpTokenBalance > initialLpTokenBalance, "Tokens were not received from the liquidity pool");

        return resultLpTokenBalance - initialLpTokenBalance;
    }

    function withdrawBaseToken(address _withdrawableToken, uint256 _userLpTokensAmount) internal override {
        address self = address(this);
        IERC20 withdrawableToken = IERC20(_withdrawableToken);

        int128 tokenIndex;
        if (withdrawableToken == firstTokenInBasePool) {
            tokenIndex = 0;
        } else if (withdrawableToken == secondTokenInBasePool) {
            tokenIndex = 1;
        } else {
            revert("!token");
        }

        uint256 initialLpTokenBalance = withdrawableToken.balanceOf(self);
        basePool.remove_liquidity_one_coin(_userLpTokensAmount, tokenIndex, 0);
        uint256 resultLpTokenBalance = withdrawableToken.balanceOf(self);

        require(resultLpTokenBalance > initialLpTokenBalance, "!base_amount");

        withdrawableToken.safeTransfer(msg.sender, resultLpTokenBalance - initialLpTokenBalance);
    }
}
