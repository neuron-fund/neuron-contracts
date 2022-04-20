pragma solidity 0.8.2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {ICurveFi_3} from "../../interfaces/ICurve.sol";
import {NeuronPoolCurveBase} from "../NeuronPoolCurveBase.sol";

contract NeuronPoolCurveIronBank is NeuronPoolCurveBase {
    using SafeERC20 for IERC20;

    ICurveFi_3 internal constant BASE_POOL =
        ICurveFi_3(0x2dded6Da1BF5DBdF597C45fcFaa3194e53EcfeAF);

    IERC20 public constant CYDAI =
        IERC20(0x8e595470Ed749b85C6F7669de83EAe304C2ec68F);
    IERC20 public constant CYUSDC =
        IERC20(0x76Eb2FE28b36B3ee97F3Adae0C69606eeDB2A37c);
    IERC20 public constant CYUSDT =
        IERC20(0x48759F220ED983dB51fA7A8C0D2AAb8f3ce4166a);
    IERC20 public constant DAI =
        IERC20(0x6B175474E89094C44Da98b954EedeAC495271d0F);
    IERC20 public constant USDC =
        IERC20(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
    IERC20 public constant USDT =
        IERC20(0xdAC17F958D2ee523a2206206994597C13D831ec7);

    constructor(
        address _token,
        address _governance,
        address _timelock,
        address _controller,
        address _masterchef
    )
        NeuronPoolCurveBase(
            _token,
            _governance,
            _timelock,
            _controller,
            _masterchef
        )
    {}

    function depositBaseToken(address _enterToken, uint256 _amount)
        internal
        override
        returns (uint256)
    {
        address self = address(this);
        IERC20 tokenMem = token;
        IERC20 enterToken = IERC20(_enterToken);

        uint256[3] memory addLiquidityPayload;
        if (enterToken == CYDAI || enterToken == DAI) {
            addLiquidityPayload[0] = _amount;
        } else if (enterToken == CYUSDC || enterToken == USDC) {
            addLiquidityPayload[1] = _amount;
        } else if (enterToken == CYUSDT || enterToken == USDT) {
            addLiquidityPayload[2] = _amount;
        } else {
            revert("!token");
        }

        enterToken.safeTransferFrom(msg.sender, self, _amount);
        enterToken.safeApprove(address(BASE_POOL), _amount);

        uint256 initialLpTokenBalance = tokenMem.balanceOf(self);

        BASE_POOL.add_liquidity(
            addLiquidityPayload,
            0,
            enterToken == DAI || enterToken == USDC || enterToken == USDT
        );

        uint256 resultLpTokenBalance = tokenMem.balanceOf(self);

        require(
            resultLpTokenBalance > initialLpTokenBalance,
            "Tokens were not received from the liquidity pool"
        );

        return resultLpTokenBalance - initialLpTokenBalance;
    }

    function withdrawBaseToken(
        address _withdrawableToken,
        uint256 _userLpTokensAmount
    ) internal override {
        address self = address(this);
        IERC20 withdrawableToken = IERC20(_withdrawableToken);

        int128 tokenIndex;
        if (withdrawableToken == CYDAI || withdrawableToken == DAI) {
            tokenIndex = 0;
        } else if (withdrawableToken == CYUSDC || withdrawableToken == USDC) {
            tokenIndex = 1;
        } else if (withdrawableToken == CYUSDT || withdrawableToken == USDT) {
            tokenIndex = 2;
        } else {
            revert("!token");
        }

        uint256 initialLpTokenBalance = withdrawableToken.balanceOf(self);
        BASE_POOL.remove_liquidity_one_coin(
            _userLpTokensAmount,
            tokenIndex,
            0,
            withdrawableToken == DAI ||
                withdrawableToken == USDC ||
                withdrawableToken == USDT
        );
        uint256 resultLpTokenBalance = withdrawableToken.balanceOf(self);

        require(resultLpTokenBalance > initialLpTokenBalance, "!base_amount");

        withdrawableToken.safeTransfer(
            msg.sender,
            resultLpTokenBalance - initialLpTokenBalance
        );
    }
}
