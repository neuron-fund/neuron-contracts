// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.2;


interface IPricer {
    function getPrice() external view returns (uint256);
}
