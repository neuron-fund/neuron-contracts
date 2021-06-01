pragma solidity ^0.7.3;

import {Context} from "@openzeppelin/contracts/GSN/Context.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {
    ERC20Burnable
} from "@openzeppelin/contracts/token/ERC20/ERC20Burnable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import {SafeMath} from "@openzeppelin/contracts/math/SafeMath.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

// TODO роли заменяются вот этим https://docs.openzeppelin.com/contracts/4.x/access-control
// SPDX-License-Identifier: ISC

contract NeuronToken is ERC20, ERC20Burnable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /**
     * @dev Modifier to make a function callable only by a certain role. In
     * addition to checking the sender's role, `address(0)` 's role is also
     * considered. Granting a role to `address(0)` is equivalent to enabling
     * this role for everyone.
     */
    modifier onlyRole(bytes32 role) {
        require(
            hasRole(role, _msgSender()) || hasRole(role, address(0)),
            "NeuronToken: sender requires permission"
        );
        _;
    }

    constructor(address _governance)
        ERC20("NeuronToken", "NEUR")
    {
        // governance will become admin who can add and revoke roles
        _setupRole(DEFAULT_ADMIN_ROLE, _governance);
    }

    function addMinter(address _minter) public onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(MINTER_ROLE, _minter);
    }

    function revokeMinter(address _minter) public onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(MINTER_ROLE, _minter);
    }

    function mint(address _to, uint256 _amount) public onlyRole(MINTER_ROLE) {
        _mint(_to, _amount);
    }

    // TODO mintFor для аксона
    function mintFor(address _who, uint256 _amount)
        external
        onlyRole(MINTER_ROLE)
    {
        _mint(_who, _amount);
    }
}
