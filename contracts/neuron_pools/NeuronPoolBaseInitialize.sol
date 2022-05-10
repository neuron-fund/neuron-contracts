pragma solidity 0.8.2;

import {ERC20Upgradeable, IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {ERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "../interfaces/IController.sol";
import {NeuronPoolCommon} from "./NeuronPoolCommon.sol";

abstract contract NeuronPoolBaseInitialize is
    NeuronPoolCommon,
    Initializable,
    ERC20Upgradeable,
    ReentrancyGuardUpgradeable
{
    function __NeuronPoolBaseInitialize_init(
        // Token accepted by the contract. E.g. 3Crv for 3poolCrv pool
        // Usually want/_want in strategies
        address _token,
        address _governance,
        address _timelock,
        address _controller,
        address _masterchef
    ) internal initializer {
        __ERC20_init(
            string(abi.encodePacked("neuroned", ERC20(_token).name())),
            string(abi.encodePacked("neur", ERC20(_token).symbol()))
        );
        __ReentrancyGuard_init_unchained();

        _decimals = ERC20(_token).decimals();
        token = IERC20(_token);
        governance = _governance;
        timelock = _timelock;
        controller = _controller;
        masterchef = _masterchef;
    }

    function deposit(address _enterToken, uint256 _amount)
        public
        override
        nonReentrant
        returns (uint256)
    {
        return super.deposit(_enterToken, _amount);
    }

    function withdraw(address _withdrawableToken, uint256 _shares)
        public
        override
        nonReentrant
    {
        super.withdraw(_withdrawableToken, _shares);
    }

    function _burn(address account, uint256 amount)
        internal
        override(NeuronPoolCommon, ERC20Upgradeable)
    {
        ERC20Upgradeable._burn(account, amount);
    }

    function _mint(address account, uint256 amount)
        internal
        override(NeuronPoolCommon, ERC20Upgradeable)
    {
        ERC20Upgradeable._mint(account, amount);
    }

    function decimals()
        public
        view
        override(NeuronPoolCommon, ERC20Upgradeable)
        returns (uint8)
    {
        return NeuronPoolCommon.decimals();
    }

    function totalSupply()
        public
        view
        override(NeuronPoolCommon, ERC20Upgradeable)
        returns (uint256)
    {
        return ERC20Upgradeable.totalSupply();
    }
}
