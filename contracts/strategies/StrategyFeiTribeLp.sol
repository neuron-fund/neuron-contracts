// SPDX-License-Identifier: MIT
pragma solidity ^0.7.3;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "./StrategyFeiFarmBase.sol";

contract StrategyFeiTribeLp is StrategyFeiFarmBase {
    using SafeERC20 for IERC20;
    using Address for address;
    using SafeMath for uint256;

    // Token addresses
    address public fei_rewards = 0x18305DaAe09Ea2F4D51fAa33318be5978D251aBd;
    address public uni_fei_tribe_lp =
        0x9928e4046d7c6513326cCeA028cD3e7a91c7590A;

    constructor(
        address _governance,
        address _strategist,
        address _controller,
        address _timelock
    )
        public
        StrategyFeiFarmBase(
            fei_rewards,
            uni_fei_tribe_lp,
            _governance,
            _strategist,
            _controller,
            _timelock
        )
    {}

    // **** Views ****

    function getName() external pure override returns (string memory) {
        return "StrategyFeiTribeLp";
    }
}
