pragma solidity 0.8.9;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {ICurveFi_2} from "../../interfaces/ICurve.sol";
import {NeuronPoolBaseInitialize} from "../NeuronPoolBaseInitialize.sol";

contract NeuronPoolCurveTokenEthExtends is NeuronPoolBaseInitialize {
    using SafeERC20 for IERC20;

    ICurveFi_2 internal basePool;
    IERC20 internal secondTokenInBasePool;
    IERC20 internal constant WETH = IERC20(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);

    function initialize(
        address _token,
        address _governance,
        address _timelock,
        address _controller,
        address _masterchef,
        address _basePool,
        address _secondTokenInBasePool
    ) external initializer {
        __NeuronPoolBaseInitialize_init(_token, _governance, _timelock, _controller, _masterchef);
        basePool = ICurveFi_2(_basePool);
        secondTokenInBasePool = IERC20(_secondTokenInBasePool);
    }

    function getSupportedTokens() external view override returns (address[] memory tokens) {
        tokens = new address[](3);
        tokens[0] = address(token);
        tokens[1] = address(WETH);
        tokens[2] = address(secondTokenInBasePool);
    }

    function depositBaseToken(address _enterToken, uint256 _amount) internal override returns (uint256) {
        address self = address(this);
        IERC20 _token = token;
        IERC20 enterToken = IERC20(_enterToken);
        ICurveFi_2 _basePool = basePool;

        uint256[2] memory addLiquidityPayload;
        if (enterToken == WETH) {
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

        _basePool.add_liquidity{value: enterToken == WETH ? _amount : 0}(addLiquidityPayload, 0);

        uint256 resultLpTokenBalance = _token.balanceOf(self);

        require(resultLpTokenBalance > initialLpTokenBalance, "Tokens were not received from the liquidity pool");

        return resultLpTokenBalance - initialLpTokenBalance;
    }

    function withdrawBaseToken(address _withdrawableToken, uint256 _userLpTokensAmount) internal override {
        address self = address(this);
        IERC20 withdrawableToken = IERC20(_withdrawableToken);

        int128 tokenIndex;
        if (withdrawableToken == WETH) {
            tokenIndex = 0;

            uint256 initialETHBalance = self.balance;
            basePool.remove_liquidity_one_coin(_userLpTokensAmount, tokenIndex, 0);
            uint256 resultETHBalance = self.balance;

            require(resultETHBalance > initialETHBalance, "!base_amount");

            withdrawableToken.safeTransfer(msg.sender, resultETHBalance - initialETHBalance);
        } else if (withdrawableToken == secondTokenInBasePool) {
            tokenIndex = 1;

            uint256 initialWithdrawableTokenBalance = withdrawableToken.balanceOf(self);
            basePool.remove_liquidity_one_coin(_userLpTokensAmount, tokenIndex, 0);
            uint256 resultWithdrawableTokenBalance = withdrawableToken.balanceOf(self);

            require(resultWithdrawableTokenBalance > initialWithdrawableTokenBalance, "!base_amount");

            withdrawableToken.safeTransfer(msg.sender, resultWithdrawableTokenBalance - initialWithdrawableTokenBalance);
        } else {
            revert("!token");
        }
    }
}
