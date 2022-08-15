// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.9;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract AirDrop is Initializable, Ownable {

    IERC20 public token;

    bytes32 public merkleRoot;
    
    uint256 public dateOfExpiry;

    bool public isInitialized;

    mapping(address => bool) public claimedAirDrop;

    event Initialized(address token, uint256 totalAmount, bytes32 merkleRoot, uint256 dateOfExpiry);

    event Claimed(address indexed claimer, uint256 amount);

    modifier initialized() {
        require(isInitialized, "Airdrop has not been initialized yet");
        _;
    }

    modifier isExpired(bool _yes) {
        require(block.timestamp > dateOfExpiry == _yes, "You cannot perform this action right now");
        _;
    }

    function initialize(
        IERC20 _token,
        uint256 _totalAmount,
        bytes32 _merkleRoot,
        uint256 _expiry
    ) external initializer onlyOwner {
        require(_totalAmount > 0, "An insufficient amount");
        require(_expiry > 0, "expiry must be greater than zero");

        address self = address(this);

        _token.transferFrom(msg.sender, self, _totalAmount);
        require(_token.balanceOf(self) == _totalAmount, "Failed to get tokens");

        token = _token;
        merkleRoot = _merkleRoot;
        uint256 _dateOfExpiry = block.timestamp + _expiry;
        dateOfExpiry = _dateOfExpiry;
        isInitialized = true;

        emit Initialized(address(_token), _totalAmount, _merkleRoot, _dateOfExpiry);
    }

    function claimAirDrop(uint256 _amount, bytes32[] calldata _merkleProof) external {
        require(canClaimAirDrop(msg.sender, _amount, _merkleProof), "Access denied");

        claimedAirDrop[msg.sender] = true;

        token.transfer(msg.sender, _amount);

        emit Claimed(msg.sender, _amount);
    }

    function canClaimAirDrop(
        address _claimer,
        uint256 _amount,
        bytes32[] calldata _merkleProof
    ) public view initialized isExpired(false) returns (bool) {
        return
            _amount > 0 &&
            token.balanceOf(address(this)) >= _amount &&
            !claimedAirDrop[_claimer] &&
            MerkleProof.verify(_merkleProof, merkleRoot, keccak256(abi.encodePacked(_claimer, _amount)));
    }

    function withdrawAfterExipired(address _recipient) external onlyOwner isExpired(true) {
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "Insufficient funds to withdraw");
        token.transfer(_recipient, balance);
    }
}
