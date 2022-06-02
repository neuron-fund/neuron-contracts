// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

contract ForceSend {
    function go(address payable victim) external payable {
        selfdestruct(victim);
    }
}