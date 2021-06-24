pragma solidity ^0.7.3;

interface IAxon {
    function balanceOf(addr: address, _t: uint256 = block.timestamp) public view returns (uint256);

    function balanceOfAt(addr: address, _block: uint256) public view returns (uint256);

    function totalSupply(t: uint256 = block.timestamp) public view returns (uint256);
}
