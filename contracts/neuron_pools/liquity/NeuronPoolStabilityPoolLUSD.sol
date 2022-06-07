pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {NeuronPoolBase} from "../NeuronPoolBase.sol";

contract NeuronPoolStabilityPoolLUSD is NeuronPoolBase {
    using SafeERC20 for IERC20;

    constructor(
        address _token,
        address _governance,
        address _timelock,
        address _controller,
        address _masterchef
    ) NeuronPoolBase(_token, _governance, _timelock, _controller, _masterchef) {}

    function getSupportedTokens() external view override returns (address[] memory tokens) {
        tokens = new address[](1);
        tokens[0] = address(token);
    }

    function depositBaseToken(address _enterToken, uint256 _amount) internal pure override returns (uint256) {
        require(false, "Not supported token");
    }

    function withdrawBaseToken(address _withdrawableToken, uint256 _userLpTokensAmount) internal pure override {
        require(false, "Not supported token");
    }
}
