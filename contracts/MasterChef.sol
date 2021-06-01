pragma solidity ^0.7.3;

import "@openzeppelin/contracts/utils/EnumerableSet.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

import "./NeuronToken.sol";

contract MasterChef is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // The NEURON TOKEN!
    NeuronToken public neuronToken;
    // Dev fund (2%, initially)
    uint256 public devFundDivRate = 50;
    address public governance;
    // Dev address.
    address public devaddr;
    // Block number when bonus NEURON period ends.
    uint256 public bonusEndBlock;
    // NEURON tokens created per block.
    uint256 public neuronTokenPerBlock;
    // Bonus muliplier for early nueron makers.
    uint256 public constant BONUS_MULTIPLIER = 10;

    // The block number when NEURON mining starts.
    uint256 public startBlock;

    address public distributor;
    uint256 public distributorLastRewardBlock;

    // Events
    event Recovered(address token, uint256 amount);
    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event EmergencyWithdraw(
        address indexed user,
        uint256 indexed pid,
        uint256 amount
    );

    modifier onlyGovernance() {
        require(
            governance == _msgSender(),
            "Governance: caller is not the governance"
        );
        _;
    }

    constructor(
        NeuronToken _neuronToken,
        address _governance,
        address _devaddr,
        uint256 _neuronTokenPerBlock,
        uint256 _startBlock,
        uint256 _bonusEndBlock
    ) {
        neuronToken = _neuronToken;
        governance = _governance;
        devaddr = _devaddr;

        distributorLastRewardBlock = block.number > startBlock
            ? block.number
            : startBlock;

        neuronTokenPerBlock = _neuronTokenPerBlock;
        startBlock = _startBlock;
        bonusEndBlock = _bonusEndBlock;
    }

    // Return reward multiplier over the given _from to _to block.
    function getMultiplier(uint256 _from, uint256 _to)
        public
        view
        returns (uint256)
    {
        if (_to <= bonusEndBlock) {
            return _to.sub(_from).mul(BONUS_MULTIPLIER);
        } else if (_from >= bonusEndBlock) {
            return _to.sub(_from);
        } else {
            return
                bonusEndBlock.sub(_from).mul(BONUS_MULTIPLIER).add(
                    _to.sub(bonusEndBlock)
                );
        }
    }

    function collect() external {
        require(msg.sender == distributor, "Only distributor can collect");
        uint256 multiplier =
            getMultiplier(distributorLastRewardBlock, block.number);
        distributorLastRewardBlock = block.number;
        uint256 neuronTokenReward = multiplier.mul(neuronTokenPerBlock);
        neuronToken.mint(devaddr, neuronTokenReward.div(devFundDivRate));
        neuronToken.mint(distributor, neuronTokenReward);
    }

    // Safe neuronToken transfer function, just in case if rounding error causes pool to not have enough PICKLEs.
    function safeNeuronTokenTransfer(address _to, uint256 _amount) internal {
        uint256 neuronTokenBalance = neuronToken.balanceOf(address(this));
        if (_amount > neuronTokenBalance) {
            neuronToken.transfer(_to, neuronTokenBalance);
        } else {
            neuronToken.transfer(_to, _amount);
        }
    }

    // Update dev address by the previous dev.
    function setDevAddr(address _devaddr) external {
        require(msg.sender == devaddr, "dev: wut?");
        devaddr = _devaddr;
    }

    // **** Additional functions separate from the original masterchef contract ****

    function setNeuronTokenPerBlock(uint256 _neuronTokenPerBlock)
        external
        onlyGovernance
    {
        require(_neuronTokenPerBlock > 0, "!neuronTokenPerBlock-0");

        neuronTokenPerBlock = _neuronTokenPerBlock;
    }

    function setBonusEndBlock(uint256 _bonusEndBlock) external onlyGovernance {
        bonusEndBlock = _bonusEndBlock;
    }

    function setDevFundDivRate(uint256 _devFundDivRate)
        external
        onlyGovernance
    {
        require(_devFundDivRate > 0, "!devFundDivRate-0");
        devFundDivRate = _devFundDivRate;
    }

    function setDistributor(address _distributor) external onlyGovernance {
        distributor = _distributor;
        distributorLastRewardBlock = block.number > startBlock
            ? block.number
            : startBlock;
    }
}
