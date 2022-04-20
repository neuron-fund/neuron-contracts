pragma solidity 0.8.2;

import {ERC20Upgradeable, IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {ERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "../interfaces/IController.sol";

abstract contract NeuronPoolBaseInitialize is Initializable, ERC20Upgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;
    // using SafeERC20Upgradeable for IERC20Upgradeable;
    using Address for address;
    using SafeMath for uint256;

    // Token accepted by the contract. E.g. 3Crv for 3poolCrv pool
    // Usually want/_want in strategies
    IERC20 public token;

    uint256 public min = 9500;
    uint256 public constant max = 10000;

    uint8 public _decimals;

    address public governance;
    address public timelock;
    address public controller;
    address public masterchef;

    function __NeuronPoolBaseInitialize_init(
        // Token accepted by the contract. E.g. 3Crv for 3poolCrv pool
        // Usually want/_want in strategies
        address _token,
        address _governance,
        address _timelock,
        address _controller,
        address _masterchef
    ) internal initializer {
        __ERC20_init(
            string(abi.encodePacked("neuroned", ERC20(_token).name())),
            string(abi.encodePacked("neur", ERC20(_token).symbol()))
        );
        __ReentrancyGuard_init_unchained();
        
        _decimals = ERC20(_token).decimals();
        token = IERC20(_token);
        governance = _governance;
        timelock = _timelock;
        controller = _controller;
        masterchef = _masterchef;
    }

    function depositAll(address _enterToken) external {
        deposit(_enterToken, IERC20(_enterToken).balanceOf(msg.sender));
    }

    function deposit(address _enterToken, uint256 _amount)
        public
        virtual
        nonReentrant
    {}

    function withdrawAll(address _withdrawableToken) external {
        withdraw(_withdrawableToken, IERC20(_withdrawableToken).balanceOf(msg.sender));
    }

    function withdraw(address _withdrawableToken, uint256 _shares)
        public
        virtual
        nonReentrant
    {}

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    // Balance = pool's balance + pool's token controller contract balance
    function balance() public view returns (uint256) {
        return
            token.balanceOf(address(this)).add(
                IController(controller).balanceOf(address(token))
            );
    }

    function setMin(uint256 _min) external {
        require(msg.sender == governance, "!governance");
        require(_min <= max, "numerator cannot be greater than denominator");
        min = _min;
    }

    function setGovernance(address _governance) public {
        require(msg.sender == governance, "!governance");
        governance = _governance;
    }

    function setTimelock(address _timelock) public {
        require(msg.sender == timelock, "!timelock");
        timelock = _timelock;
    }

    function setController(address _controller) public {
        require(msg.sender == timelock, "!timelock");
        controller = _controller;
    }

    // Returns tokens available for deposit into the pool
    // Custom logic in here for how much the pools allows to be borrowed
    function available() public view returns (uint256) {
        return token.balanceOf(address(this)).mul(min).div(max);
    }

    // Depositing tokens into pool
    // Usually called manually in tests
    function earn() public {
        uint256 _bal = available();
        token.safeTransfer(controller, _bal);
        IController(controller).earn(address(token), _bal);
    }

    // Used to swap any borrowed reserve over the debt limit to liquidate to 'token'
    function harvest(address reserve, uint256 amount) external {
        require(msg.sender == controller, "!controller");
        require(reserve != address(token), "token");
        IERC20(reserve).safeTransfer(controller, amount);
    }

    function getRatio() public view returns (uint256) {
        uint256 currentTotalSupply = totalSupply();
        if (currentTotalSupply == 0) {
            return 0;
        }
        return balance().mul(1e18).div(currentTotalSupply);
    }
}
