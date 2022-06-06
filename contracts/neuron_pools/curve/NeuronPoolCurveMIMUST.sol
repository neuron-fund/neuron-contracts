pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {ICurveFi_2} from "../../interfaces/ICurve.sol";
import {NeuronPoolBase} from "../NeuronPoolBase.sol";

contract NeuronPoolCurveMIMUST is NeuronPoolBase {
    using SafeERC20 for IERC20;

    ICurveFi_2 internal constant BASE_POOL = ICurveFi_2(0x55A8a39bc9694714E2874c1ce77aa1E599461E18);

    IERC20 internal constant MIM = IERC20(0x99D8a9C45b2ecA8864373A26D1459e3Dff1e17F3);
    IERC20 internal constant UST = IERC20(0xa47c8bf37f92aBed4A126BDA807A7b7498661acD);

    constructor(
        address _token,
        address _governance,
        address _timelock,
        address _controller,
        address _masterchef
    ) NeuronPoolBase(_token, _governance, _timelock, _controller, _masterchef) {}

    function getSupportedTokens() external view override returns (address[] memory tokens) {
        tokens = new address[](3);
        tokens[0] = address(token);
        tokens[1] = address(MIM);
        tokens[2] = address(UST);
    }

    function depositBaseToken(address _enterToken, uint256 _amount) internal override returns (uint256) {
        address self = address(this);
        IERC20 tokenMem = token;
        IERC20 enterToken = IERC20(_enterToken);

        uint256[2] memory addLiquidityPayload;
        if (enterToken == MIM) {
            addLiquidityPayload[0] = _amount;
        } else if (enterToken == UST) {
            addLiquidityPayload[1] = _amount;
        } else {
            revert("!token");
        }

        enterToken.safeTransferFrom(msg.sender, self, _amount);
        enterToken.safeApprove(address(BASE_POOL), 0);
        enterToken.safeApprove(address(BASE_POOL), _amount);

        uint256 initialLpTokenBalance = tokenMem.balanceOf(self);

        BASE_POOL.add_liquidity(addLiquidityPayload, 0);

        uint256 resultLpTokenBalance = tokenMem.balanceOf(self);

        require(resultLpTokenBalance > initialLpTokenBalance, "Tokens were not received from the liquidity pool");

        return resultLpTokenBalance - initialLpTokenBalance;
    }

    function withdrawBaseToken(address _withdrawableToken, uint256 _userLpTokensAmount) internal override {
        address self = address(this);
        IERC20 withdrawableToken = IERC20(_withdrawableToken);

        int128 tokenIndex;
        if (withdrawableToken == MIM) {
            tokenIndex = 0;
        } else if (withdrawableToken == UST) {
            tokenIndex = 1;
        } else {
            revert("!token");
        }

        uint256 initialLpTokenBalance = withdrawableToken.balanceOf(self);
        BASE_POOL.remove_liquidity_one_coin(_userLpTokensAmount, tokenIndex, 0);
        uint256 resultLpTokenBalance = withdrawableToken.balanceOf(self);

        require(resultLpTokenBalance > initialLpTokenBalance, "!base_amount");

        withdrawableToken.safeTransfer(msg.sender, resultLpTokenBalance - initialLpTokenBalance);
    }
}
