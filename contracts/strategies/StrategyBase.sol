pragma solidity ^0.7.3;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "../interfaces/INeuronPool.sol";
import "../interfaces/IStakingRewards.sol";
import "../interfaces/IMasterchef.sol";
import "../interfaces/IUniswapRouterV2.sol";
import "../interfaces/IController.sol";

// Strategy Contract Basics

abstract contract StrategyBase {
    using SafeERC20 for IERC20;
    using Address for address;
    using SafeMath for uint256;

    // Perfomance fees - start with 20%
    uint256 public performanceTreasuryFee = 2000;
    uint256 public constant performanceTreasuryMax = 10000;

    // Сейчас у пикла это 7.5%
    uint256 public performanceDevFee = 0;
    uint256 public constant performanceDevMax = 10000;

    // Withdrawal fee 0%
    // - 0% to treasury
    // - 0% to dev fund
    uint256 public withdrawalTreasuryFee = 0;
    uint256 public constant withdrawalTreasuryMax = 100000;

    uint256 public withdrawalDevFundFee = 0;
    uint256 public constant withdrawalDevFundMax = 100000;

    // Tokens
    // Токен который контракт принимает на вход
    address public want;
    address public constant weth = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    // User accounts
    address public governance;
    address public controller;
    address public strategist;
    address public timelock;

    // Dex
    address public univ2Router2 = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address public sushiRouter = 0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F;

    mapping(address => bool) public harvesters;

    constructor(
        // Токен который контракт принимает на вход
        address _want,
        address _governance,
        address _strategist,
        address _controller,
        address _timelock
    ) {
        require(_want != address(0));
        require(_governance != address(0));
        require(_strategist != address(0));
        require(_controller != address(0));
        require(_timelock != address(0));

        want = _want;
        governance = _governance;
        strategist = _strategist;
        controller = _controller;
        timelock = _timelock;
    }

    // **** Modifiers **** //

    modifier onlyBenevolent {
        require(
            harvesters[msg.sender] ||
                msg.sender == governance ||
                msg.sender == strategist
        );
        _;
    }

    // **** Views **** //

    function balanceOfWant() public view returns (uint256) {
        return IERC20(want).balanceOf(address(this));
    }

    function balanceOfPool() public view virtual returns (uint256);

    function balanceOf() public view returns (uint256) {
        return balanceOfWant().add(balanceOfPool());
    }

    function getName() external pure virtual returns (string memory);

    // **** Setters **** //

    function whitelistHarvester(address _harvester) external {
        require(
            msg.sender == governance || msg.sender == strategist,
            "not authorized"
        );
        harvesters[_harvester] = true;
    }

    function revokeHarvester(address _harvester) external {
        require(
            msg.sender == governance || msg.sender == strategist,
            "not authorized"
        );
        harvesters[_harvester] = false;
    }

    function setWithdrawalDevFundFee(uint256 _withdrawalDevFundFee) external {
        require(msg.sender == timelock, "!timelock");
        withdrawalDevFundFee = _withdrawalDevFundFee;
    }

    function setWithdrawalTreasuryFee(uint256 _withdrawalTreasuryFee) external {
        require(msg.sender == timelock, "!timelock");
        withdrawalTreasuryFee = _withdrawalTreasuryFee;
    }

    function setPerformanceDevFee(uint256 _performanceDevFee) external {
        require(msg.sender == timelock, "!timelock");
        performanceDevFee = _performanceDevFee;
    }

    function setPerformanceTreasuryFee(uint256 _performanceTreasuryFee)
        external
    {
        require(msg.sender == timelock, "!timelock");
        performanceTreasuryFee = _performanceTreasuryFee;
    }

    function setStrategist(address _strategist) external {
        require(msg.sender == governance, "!governance");
        strategist = _strategist;
    }

    function setGovernance(address _governance) external {
        require(msg.sender == governance, "!governance");
        governance = _governance;
    }

    function setTimelock(address _timelock) external {
        require(msg.sender == timelock, "!timelock");
        timelock = _timelock;
    }

    function setController(address _controller) external {
        require(msg.sender == timelock, "!timelock");
        controller = _controller;
    }

    // **** State mutations **** //
    function deposit() public virtual;

    // Controller only function for creating additional rewards from dust
    function withdraw(IERC20 _asset) external returns (uint256 balance) {
        require(msg.sender == controller, "!controller");
        require(want != address(_asset), "want");
        balance = _asset.balanceOf(address(this));
        _asset.safeTransfer(controller, balance);
    }

    // Withdraw partial funds, normally used with a jar withdrawal
    function withdraw(uint256 _amount) external {
        require(msg.sender == controller, "!controller");
        uint256 _balance = IERC20(want).balanceOf(address(this));
        if (_balance < _amount) {
            _amount = _withdrawSome(_amount.sub(_balance));
            _amount = _amount.add(_balance);
        }

        uint256 _feeDev =
            _amount.mul(withdrawalDevFundFee).div(withdrawalDevFundMax);
        IERC20(want).safeTransfer(IController(controller).devfund(), _feeDev);

        uint256 _feeTreasury =
            _amount.mul(withdrawalTreasuryFee).div(withdrawalTreasuryMax);
        IERC20(want).safeTransfer(
            IController(controller).treasury(),
            _feeTreasury
        );

        address _nPool = IController(controller).nPools(address(want));
        require(_nPool != address(0), "!nPool"); // additional protection so we don't burn the funds

        IERC20(want).safeTransfer(
            _nPool,
            _amount.sub(_feeDev).sub(_feeTreasury)
        );
    }

    // Withdraw funds, used to swap between strategies
    function withdrawForSwap(uint256 _amount)
        external
        returns (uint256 balance)
    {
        require(msg.sender == controller, "!controller");
        _withdrawSome(_amount);

        balance = IERC20(want).balanceOf(address(this));

        address _nPool = IController(controller).nPools(address(want));
        require(_nPool != address(0), "!nPool");
        IERC20(want).safeTransfer(_nPool, balance);
    }

    // Withdraw all funds, normally used when migrating strategies
    function withdrawAll() external returns (uint256 balance) {
        require(msg.sender == controller, "!controller");
        _withdrawAll();

        balance = IERC20(want).balanceOf(address(this));

        address _nPool = IController(controller).nPools(address(want));
        require(_nPool != address(0), "!nPool"); // additional protection so we don't burn the funds
        IERC20(want).safeTransfer(_nPool, balance);
    }

    function _withdrawAll() internal {
        _withdrawSome(balanceOfPool());
    }

    function _withdrawSome(uint256 _amount) internal virtual returns (uint256);

    function harvest() public virtual;

    // **** Emergency functions ****

    function execute(address _target, bytes memory _data)
        public
        payable
        returns (bytes memory response)
    {
        require(msg.sender == timelock, "!timelock");
        require(_target != address(0), "!target");

        // call contract in current context
        assembly {
            let succeeded := delegatecall(
                sub(gas(), 5000),
                _target,
                add(_data, 0x20),
                mload(_data),
                0,
                0
            )
            let size := returndatasize()

            response := mload(0x40)
            mstore(
                0x40,
                add(response, and(add(add(size, 0x20), 0x1f), not(0x1f)))
            )
            mstore(response, size)
            returndatacopy(add(response, 0x20), 0, size)

            switch iszero(succeeded)
                case 1 {
                    // throw if delegatecall failed
                    revert(add(response, 0x20), size)
                }
        }
    }

    // **** Internal functions ****
    function _swapUniswap(
        address _from,
        address _to,
        uint256 _amount
    ) internal {
        require(_to != address(0));

        address[] memory path;

        if (_from == weth || _to == weth) {
            path = new address[](2);
            path[0] = _from;
            path[1] = _to;
        } else {
            path = new address[](3);
            path[0] = _from;
            path[1] = weth;
            path[2] = _to;
        }

        IUniswapRouterV2(univ2Router2).swapExactTokensForTokens(
            _amount,
            0,
            path,
            address(this),
            block.timestamp.add(60)
        );
    }

    function _swapUniswapWithPath(address[] memory path, uint256 _amount)
        internal
    {
        require(path[1] != address(0));

        IUniswapRouterV2(univ2Router2).swapExactTokensForTokens(
            _amount,
            0,
            path,
            address(this),
            block.timestamp.add(60)
        );
    }

    function _swapSushiswap(
        address _from,
        address _to,
        uint256 _amount
    ) internal {
        require(_to != address(0));

        address[] memory path;

        if (_from == weth || _to == weth) {
            path = new address[](2);
            path[0] = _from;
            path[1] = _to;
        } else {
            path = new address[](3);
            path[0] = _from;
            path[1] = weth;
            path[2] = _to;
        }

        IUniswapRouterV2(sushiRouter).swapExactTokensForTokens(
            _amount,
            0,
            path,
            address(this),
            block.timestamp.add(60)
        );
    }

    function _swapSushiswapWithPath(address[] memory path, uint256 _amount)
        internal
    {
        require(path[1] != address(0));

        IUniswapRouterV2(sushiRouter).swapExactTokensForTokens(
            _amount,
            0,
            path,
            address(this),
            block.timestamp.add(60)
        );
    }

    function _distributePerformanceFeesAndDeposit() internal {
        uint256 _want = IERC20(want).balanceOf(address(this));

        if (_want > 0) {
            // Treasury fees
            // Отправляет в tresury токены стратегии. 20% (задается константой performanceTreasuryFee)  от средств на счете стратегии
            IERC20(want).safeTransfer(
                IController(controller).treasury(),
                _want.mul(performanceTreasuryFee).div(performanceTreasuryMax)
            );

            // Performance fee
            // Отправляет в devfund токены стратегии. 7.5% сейчас у пикла (задается константой perfomanceDevFee) от средств на счете стратегии
            IERC20(want).safeTransfer(
                IController(controller).devfund(),
                _want.mul(performanceDevFee).div(performanceDevMax)
            );

            deposit();
        }
    }
}
