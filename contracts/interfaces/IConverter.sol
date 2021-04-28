pragma solidity ^0.7.3;

interface IConverter {
    function convert(address) external returns (uint256);
}
