pragma solidity 0.8.2;

interface IUSDT {
    function isBlackListed(address) external view returns(bool);
}