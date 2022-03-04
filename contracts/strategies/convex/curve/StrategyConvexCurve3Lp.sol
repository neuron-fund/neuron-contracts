// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "../StrategyConvexFarmBase.sol";
import "../../../interfaces/ICurve.sol";

contract StrategyConvexCurve3Lp is StrategyConvexFarmBase {
    using SafeERC20 for IERC20;
    using Address for address;

    // Convex pool data
    uint256 public constant threeLpPoolId = 9;
    address public constant threeCrv =
        0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490; // токен-расписка из пула curve: 3Crv
    address public constant threeLpReward =
        0x689440f2Ff927E1f24c72F1087E1FAF471eCe1c8; // адрес на котором находяться вознаграждения полученные от convex, за стейкинг curve
    address public constant threePool =
        0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7; // адрес пула curve, в данном случаем 3Pool

    // stablecoins
    address public constant dai = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address public constant usdc = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant usdt = 0xdAC17F958D2ee523a2206206994597C13D831ec7;

    constructor(
        address _want,
        address _governance,
        address _strategist,
        address _controller,
        address _neuronTokenAddress,
        address _timelock
    )
        StrategyConvexFarmBase(
            threeCrv,
            _governance,
            _strategist,
            _controller,
            _neuronTokenAddress,
            _timelock,
            threeLpPoolId,
            threeLpReward
        )
    {}

    function getName() external pure override returns (string memory) {
        return "StrategyConvexCurve3Lp";
    }

    // Собираем нафармелнные токены convex, curve, и стейблкоины. Стейблкоины реинвестируем обратно в пул curve
    function harvest() public override onlyBenevolent {

        // Собираем токены convex, и обмениваем их на токен curve
        uint256 _cvx = IERC20(cvx).balanceOf(address(this));
        if (_cvx > 0) {
            IERC20(cvx).safeApprove(sushiRouter, 0);
            IERC20(cvx).safeApprove(sushiRouter, _cvx);
            _swapSushiswap(cvx, crv, _cvx);
        }

        (address to, uint256 toIndex) = getMostPremium(); // Сбор стейблкоинов

        uint256 _crv = IERC20(crv).balanceOf(address(this)); // Сбор токенов Curve
        if (_crv > 0) {
            _swapToNeurAndDistributePerformanceFees(crv, sushiRouter); // Инвестируем в наш токен
        }
        _crv = IERC20(crv).balanceOf(address(this)); // Обновляем баланс токенов Curve
        if (_crv > 0) {
            uint256 _keepCRV = (_crv * keepCRV) / keepCRVMax; // ?
            if (_keepCRV > 0) {
                IERC20(crv).safeTransfer(
                    IController(controller).treasury(), // Разрешаем перевести какую-то часть токенов curve на адрес нашего контракта сокровиницы ?
                    _keepCRV
                );
            }
            _crv = _crv - _keepCRV; // Вычисляем оставшийся баланс токенов curve
            // Converts CRV to stablecoins
            _swapUniswap(crv, to, _crv); // меняем их на стейблкоины
        }
        // Adds liquidity to curve.fi's pool
        // to get back want (scrv)
        uint256 _to = IERC20(to).balanceOf(address(this)); // Обновляем баланс стейблкоинов
        if (_to > 0) {
            IERC20(to).safeApprove(threePool, 0);
            IERC20(to).safeApprove(threePool, _to);
            uint256[3] memory liquidity;
            liquidity[toIndex] = _to;
            // Transferring stablecoins back to Curve
            ICurveFi_3(threePool).add_liquidity(liquidity, 0); // Вносим стейблкоины в пул curve
        }
        deposit();
    }

    function getMostPremium() public view returns (address, uint256) {
        ICurveFi_3 curve = ICurveFi_3(threePool);
        uint256[3] memory balances = [
            curve.balances(0), // DAI
            curve.balances(1) * (10**12), // USDC
            curve.balances(2) * (10**12) // USDT
        ];

        // USDC
        if (balances[1] < balances[0] && balances[1] < balances[2]) {
            return (usdc, 1);
        }

        // USDT
        if (balances[2] < balances[0] && balances[2] < balances[1]) {
            return (usdt, 2);
        }

        // If they're somehow equal, we just want DAI
        return (dai, 0);
    }
}
