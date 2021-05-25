pragma solidity ^0.7.3;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "./interfaces/IMasterchef.sol";
import "./interfaces/IController.sol";

contract NeuronPool is ERC20 {
    using SafeERC20 for IERC20;
    using Address for address;
    using SafeMath for uint256;

    // Токен который принимает контракт. Например для Jar который создает под стратегию 3poolCrv это будет токен 3Crv
    // В стратегиях эта переменная обычно называется want или _want
    IERC20 public token;

    uint256 public min = 9500;
    uint256 public constant max = 10000;

    address public governance;
    address public timelock;
    address public controller;
    address public masterchef;

    constructor(
        // Токен который принимает контракт. Например для Jar который создает под стратегию 3poolCrv это будет токен 3Crv
        // В стратегиях эта переменная обычно называется want или _want
        address _token,
        address _governance,
        address _timelock,
        address _controller,
        address _masterchef
    )
        ERC20(
            // TODO neuroned звучит убого
            string(abi.encodePacked("neuroned", ERC20(_token).name())),
            string(abi.encodePacked("neur", ERC20(_token).symbol()))
        )
    {
        _setupDecimals(ERC20(_token).decimals());
        token = IERC20(_token);
        governance = _governance;
        timelock = _timelock;
        controller = _controller;
        masterchef = _masterchef;
    }

    // Баланс считается из баланса в банке и баланса токена этой банки в контроллере
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

    // Возввращает кол-во токенов, которые можно положить в пул
    // небольшое кол-во сохраняется, чтобы быстро и дешево делать небольшие выводы с пула.
    // Как лучше считать это небольшое кол-во - ?
    // Custom logic in here for how much the jars allows to be borrowed
    // Sets minimum required on-hand to keep small withdrawals cheap
    function available() public view returns (uint256) {
        return token.balanceOf(address(this)).mul(min).div(max);
    }

    // Здесь и происходит депозит токена в пул. Когда вызывается эта функция?
    // В тестах она вызывается вручную.
    function earn() public {
        uint256 _bal = available();
        token.safeTransfer(controller, _bal);
        IController(controller).earn(address(token), _bal);
    }

    function depositAll() external {
        deposit(token.balanceOf(msg.sender));
    }

    // Это точка входа для пользователя, именно эта функция вызывается, когда мы нажимаем кнопку Deposit в интерфейсе
    function deposit(uint256 _amount) public {
        // Баланс на счету банки + баланс в контроллере
        uint256 _pool = balance();
        uint256 _before = token.balanceOf(address(this));
        token.safeTransferFrom(msg.sender, address(this), _amount);
        uint256 _after = token.balanceOf(address(this));
        _amount = _after.sub(_before); // Additional check for deflationary tokens Непонял что это и зачем
        uint256 shares = 0;
        // totalSupply - общее количество pТокена, токена который дается в обмен на депозит в пуле, например p3CRV для 3crv банки
        if (totalSupply() == 0) {
            // Количество токенов которое получит юзер в обмен на депозит. Первый юзер получает такое же кол-во, как депозит
            shares = _amount;
        } else {
            // Для последующих юзеров формула: (tokens_stacked * exist_pTokens) / total_tokens_stacked. total_tokesn_stacked - не считая новых
            shares = (_amount.mul(totalSupply())).div(_pool);
        }
        _mint(msg.sender, shares);
    }

    // Это точка входа для пользователя, именно эта функция вызывается, когда мы нажимаем кнопку Deposit в интерфейсе
    function depositAndFarm(uint256 _amount, uint256 farmPid) public {
        // Баланс на счету банки + баланс в контроллере
        uint256 _pool = balance();
        uint256 _before = token.balanceOf(address(this));
        token.safeTransferFrom(msg.sender, address(this), _amount);
        uint256 _after = token.balanceOf(address(this));
        _amount = _after.sub(_before); // Additional check for deflationary tokens Непонял что это и зачем
        uint256 shares = 0;
        // totalSupply - общее количество pТокена, токена который дается в обмен на депозит в пуле, например p3CRV для 3crv банки
        if (totalSupply() == 0) {
            // Количество токенов которое получит юзер в обмен на депозит. Первый юзер получает такое же кол-во, как депозит
            shares = _amount;
        } else {
            // Для последующих юзеров формула: (tokens_stacked * exist_pTokens) / total_tokens_stacked. total_tokesn_stacked - не считая новых
            shares = (_amount.mul(totalSupply())).div(_pool);
        }

        _mint(address(this), shares);
        approve(masterchef, shares);
        IERC20(address(this)).approve(masterchef, shares);
        IMasterchef(masterchef).depositFromPool(farmPid, shares, msg.sender);
    }

    function withdrawAll() external {
        withdraw(balanceOf(msg.sender));
    }

    // Used to swap any borrowed reserve over the debt limit to liquidate to 'token'
    function harvest(address reserve, uint256 amount) external {
        require(msg.sender == controller, "!controller");
        require(reserve != address(token), "token");
        IERC20(reserve).safeTransfer(controller, amount);
    }

    // No rebalance implementation for lower fees and faster swaps
    function withdraw(uint256 _shares) public {
        // _shares - просто кол-во токенов которые юзер хочет вывести
        // Считается ли в totalSupply соженные токены?
        uint256 r = (balance().mul(_shares)).div(totalSupply());
        // Сжигает часть или все pCrv (для примера) токены юзера?
        _burn(msg.sender, _shares);

        // Check balance
        uint256 b = token.balanceOf(address(this));
        // Если на балансе банки не хватает токенов - выводим из контроллера
        if (b < r) {
            uint256 _withdraw = r.sub(b);
            IController(controller).withdraw(address(token), _withdraw);
            uint256 _after = token.balanceOf(address(this));
            uint256 _diff = _after.sub(b);
            if (_diff < _withdraw) {
                r = b.add(_diff);
            }
        }

        token.safeTransfer(msg.sender, r);
    }

    function getRatio() public view returns (uint256) {
        uint256 currentTotalSupply = totalSupply();
        if (currentTotalSupply == 0) {
            return 0;
        }
        return balance().mul(1e18).div(currentTotalSupply);
    }
}
