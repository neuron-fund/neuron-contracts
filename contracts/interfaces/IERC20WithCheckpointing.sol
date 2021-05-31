pragma solidity ^0.7.3;

// From https://github.com/aragonone/voting-connectors
abstract contract IERC20WithCheckpointing {
    function balanceOf(address _owner) virtual public view returns (uint256);

    function balanceOfAt(address _owner, uint256 _blockNumber)
        virtual public
        view
        returns (uint256);

    function totalSupply() virtual public view returns (uint256);

    function totalSupplyAt(uint256 _blockNumber) virtual public view returns (uint256);
}
