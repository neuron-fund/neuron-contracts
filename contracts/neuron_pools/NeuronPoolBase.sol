pragma solidity 0.8.2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "../interfaces/IController.sol";
import {NeuronPoolCommon} from "./NeuronPoolCommon.sol";

abstract contract NeuronPoolBase is NeuronPoolCommon, ERC20, ReentrancyGuard {
    constructor(
        // Token accepted by the contract. E.g. 3Crv for 3poolCrv pool
        // Usually want/_want in strategies
        address _token,
        address _governance,
        address _timelock,
        address _controller,
        address _masterchef
    )
        ERC20(
            string(abi.encodePacked("neuroned", ERC20(_token).name())),
            string(abi.encodePacked("neur", ERC20(_token).symbol()))
        )
    {
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
        override(NeuronPoolCommon, ERC20)
    {
        ERC20._burn(account, amount);
    }

    function _mint(address account, uint256 amount)
        internal
        override(NeuronPoolCommon, ERC20)
    {
        ERC20._mint(account, amount);
    }

    function decimals()
        public
        view
        override(NeuronPoolCommon, ERC20)
        returns (uint8)
    {
        return NeuronPoolCommon.decimals();
    }

    function totalSupply()
        public
        view
        override(NeuronPoolCommon, ERC20)
        returns (uint256)
    {
        return ERC20.totalSupply();
    }
}
