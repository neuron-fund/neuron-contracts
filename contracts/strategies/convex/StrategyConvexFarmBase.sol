// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "../StrategyBase.sol";
import "../../interfaces/IConvexFarm.sol";
import "../../interfaces/IConvexFarm.sol";

abstract contract StrategyConvexFarmBase is StrategyBase {
    using SafeERC20 for IERC20;
    using Address for address;

    uint256 public poolId;
    address public reward; // Можно динамечски через запрос по poolId получить адрес, а можно явно указать что лучше?

    address public constant convexBooster =
        0xF403C135812408BFbE8713b5A23a04b3D48AAE31; // Основной котракт convex для взаимодействия с пулами
    address public constant cvx = 0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B; // токен convex
    address public constant crv = 0xD533a949740bb3306d119CC777fa900bA034cd52; // токен curve

    // How much CRV tokens to keep
    uint256 public keepCRV = 500; // ?
    uint256 public keepCRVMax = 10000; // ?

    constructor(
        address _want, // токен-расписка из Curve
        address _governance, // Нужны пояснения по ролям _governance _strategist
        address _strategist,
        address _controller, // Что делает?
        address _neuronTokenAddress, // Адрес к нашему erc20 токену?
        address _timelock, // Тайминг вознаграждений? Как используется?
        uint256 _poolId,
        address _reward // адресс контракта в котором храниться награда от стейкинга токенов-расписок Curve
    )
        StrategyBase(
            _want,
            _governance,
            _strategist,
            _controller,
            _neuronTokenAddress,
            _timelock
        )
    {
        poolId = _poolId;
        reward = _reward;
    }

    function balanceOfPool() public view override returns (uint256) {
        return IBaseRewardPool(reward).balanceOf(address(this));
    }

    function deposit() public override {
        uint256 _want = IERC20(want).balanceOf(address(this)); // получаем баланс токенов-расписок из Curve, которые принадлежат контракту текущей стратегии
        if (_want > 0) {
            IERC20(want).safeApprove(convexBooster, 0);
            IERC20(want).safeApprove(convexBooster, _want);

            IConvexBooster(convexBooster).deposit(poolId, _want, true); // Вносим токены-расписки Curve в стейк конвекса
        }
    }

    // Нужны пояснения по этому методоы и его публичной версии, так как мне кажется дикостью возвращать аргумент, и в публичном методе тоже какая то жесть
    function _withdrawSome(uint256 _amount) 
        internal
        override
        returns (uint256)
    {
        IBaseRewardPool(reward).withdrawAndUnwrap(_amount, true);
        return _amount;
    }
}
