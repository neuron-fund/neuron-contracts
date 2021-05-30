// SPDX-License-Identifier: ISC

// FARM Token
// https://etherscan.io/address/0xa0246c9032bc3a600820415ae600c6388619a14d#code

pragma solidity ^0.7.3;

import {Context} from '@openzeppelin/contracts/GSN/Context.sol';
import {ERC20} from '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import {ERC20Capped} from '@openzeppelin/contracts/token/ERC20/ERC20Capped.sol';
import {ERC20Mintable} from '@openzeppelin/contracts/token/ERC20/ERC20Mintable.sol';
import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {SafeERC20} from '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';
import {SafeMath} from '@openzeppelin/contracts/math/SafeMath.sol';
// TODO роли заменяются вот этим https://docs.openzeppelin.com/contracts/4.x/access-control
import {Roles} from '@openzeppelin/contracts/access/Roles.sol';
import {MinterRole} from '@openzeppelin/contracts/access/roles/MinterRole.sol';

// SPDX-License-Identifier: ISC


contract Governable {

  Storage public store;

  constructor(address _store) public {
    require(_store != address(0), "new storage shouldn't be empty");
    store = Storage(_store);
  }

  modifier onlyGovernance() {
    require(store.isGovernance(msg.sender), "Not governance");
    _;
  }

  function setStorage(address _store) public onlyGovernance {
    require(_store != address(0), "new storage shouldn't be empty");
    store = Storage(_store);
  }

  function governance() public view returns (address) {
    return store.governance();
  }
}

contract Storage {

  address public governance;
  address public controller;

  constructor() public {
    governance = msg.sender;
  }

  modifier onlyGovernance() {
    require(isGovernance(msg.sender), "Not governance");
    _;
  }

  function setGovernance(address _governance) public onlyGovernance {
    require(_governance != address(0), "new governance shouldn't be empty");
    governance = _governance;
  }

  function setController(address _controller) public onlyGovernance {
    require(_controller != address(0), "new controller shouldn't be empty");
    controller = _controller;
  }

  function isGovernance(address account) public view returns (bool) {
    return account == governance;
  }

  function isController(address account) public view returns (bool) {
    return account == controller;
  }
}


contract RewardToken is ERC20, ERC20Capped, Governable {

  uint256 public constant HARD_CAP = 5 * (10 ** 6) * (10 ** 18);

  constructor(address _storage) public
  ERC20("FARM Reward Token", "FARM")
  ERC20Capped(HARD_CAP)
  Governable(_storage) {
    // msg.sender should not be a minter
    renounceMinter();
    // governance will become the only minter
    _addMinter(governance());
  }

  /**
  * Overrides adding new minters so that only governance can authorized them.
  */
  function addMinter(address _minter) public onlyGovernance {
    super.addMinter(_minter);
  }
}