// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.9;

interface IPricer {
    function getPrice() external view returns (uint256);

    function setExpiryPriceInOracle(uint256 _expiryTimestamp) external;
}
