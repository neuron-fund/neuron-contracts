// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.9;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract NeuronToken is ERC20, AccessControl {

    bytes32 public constant TRANSFERS_ALLOWER_ROLE = keccak256("TRANSFERS_ALLOWER_ROLE");

    bool public isTransfersAllowed;

    event TransfersAllowed();

    constructor(address[] memory _users, address _transferAllower) ERC20("NeuronToken", "NEUR") {
        for(uint256 i; i < _users.length; i++) {
            _mint(_users[i], 100 * 10 ** decimals());
        }
        _setRoleAdmin(TRANSFERS_ALLOWER_ROLE, TRANSFERS_ALLOWER_ROLE);
        _setupRole(TRANSFERS_ALLOWER_ROLE, _transferAllower);
    }

    function allowTranfers() external onlyRole(TRANSFERS_ALLOWER_ROLE) {
        require(!isTransfersAllowed, "Transfers already allowed");
        isTransfersAllowed = true;
        emit TransfersAllowed();
    }

    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal override {
        require(isTransfersAllowed, "The Token is currently non-transferrable");
        super._transfer(sender, recipient, amount);
    }
}
