// SPDX-License-Identifier: MIT
pragma solidity ^0.7.3;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "../interfaces/INeuronPool.sol";
import "../interfaces/ICurve.sol";
import "../interfaces/IUniswapRouterV2.sol";
import "../interfaces/IController.sol";

import "./StrategyCurveBase.sol";

// Для каждой стратегии сначала создается PickleJar. Потом деплоится контракт стратегии.

// Адрес контракта этой стратегии 0x1BB74b5DdC1f4fC91D6f9E7906cf68bc93538e33
// Можно поискать по проекту адрес, чтобы увидеть где происходит деплой и как задается этот адрес.

contract StrategyCurve3CRVv2 is StrategyCurveBase {
    // TODO почему то using for не наследуется
    using SafeERC20 for IERC20;
    using Address for address;
    using SafeMath for uint256;

    // Curve stuff
    // Пул в который пойдет депозит. В данном случае 3CRV пул, он принимает на вход DAI + USDC + USDT
    address public three_pool = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;
    // Gauge пула, не совсем понял что это, но все взаимодействия происходят через этот адрес, через интерфейс ICurveGauge
    address public three_gauge = 0xbFcF63294aD7105dEa65aA58F8AE5BE2D9d0952A;

    // Это адресс контракта самого токена Curve 3Crv, в данном случае.
    // https://etherscan.io/address/0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490
    // Etherscan пишет, что контракт отвечает за два токена 3Crv и USDC
    // В эту стратегию изначальный депозит делается именно этим токеном.
    address public three_crv = 0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490;

    constructor(
        address _governance,
        address _strategist,
        address _controller,
        address _timelock
    )
        StrategyCurveBase(
            three_pool,
            three_gauge,
            three_crv,
            _governance,
            _strategist,
            _controller,
            _timelock
        )
    {
        IERC20(crv).approve(univ2Router2, uint256(-1));
    }

    // **** Views ****

    function getMostPremium() public view override returns (address, uint256) {
        uint256[] memory balances = new uint256[](3);
        balances[0] = ICurveFi_3(curve).balances(0); // DAI
        balances[1] = ICurveFi_3(curve).balances(1).mul(10**12); // USDC
        balances[2] = ICurveFi_3(curve).balances(2).mul(10**12); // USDT

        // DAI
        if (balances[0] < balances[1] && balances[0] < balances[2]) {
            return (dai, 0);
        }

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

    function getName() external pure override returns (string memory) {
        return "StrategyCurve3CRVv2";
    }

    // **** State Mutations ****
    // Функция, которая достает награду из пула, переводит в стейблкоины и закидывает обратно в пул.
    function harvest() public override onlyBenevolent {
        // Anyone can harvest it at any given time.
        // I understand the possibility of being frontrun
        // But ETH is a dark forest, and I wanna see how this plays out
        // i.e. will be be heavily frontrunned?
        //      if so, a new strategy will be deployed.

        // stablecoin we want to convert to
        (address to, uint256 toIndex) = getMostPremium();

        // Collects crv tokens
        // Don't bother voting in v1
        // Создает CRV токены и переводит на адрес стратегии??
        ICurveMintr(mintr).mint(gauge);
        uint256 _crv = IERC20(crv).balanceOf(address(this));
        if (_crv > 0) {
            // x% is sent back to the rewards holder
            // to be used to lock up in as veCRV in a future date
            // Часть токенов сохраняется в "копилке" в контроллере. Сколько именно стоит оставлять - не совсем понятно
            uint256 _keepCRV = _crv.mul(keepCRV).div(keepCRVMax);
            if (_keepCRV > 0) {
                IERC20(crv).safeTransfer(
                    IController(controller).treasury(),
                    _keepCRV
                );
            }
            _crv = _crv.sub(_keepCRV);
            // Конвертирует CRV токены в стейблкоин
            _swapUniswap(crv, to, _crv);
        }

        // Adds liquidity to curve.fi's pool
        // to get back want (scrv)
        uint256 _to = IERC20(to).balanceOf(address(this));
        if (_to > 0) {
            // Не совсем понял, зачем нужна эта функция safeApprove
            IERC20(to).safeApprove(curve, 0);
            IERC20(to).safeApprove(curve, _to);
            uint256[3] memory liquidity;
            liquidity[toIndex] = _to;
            // Закидываем стейблкоин обратно в curve
            ICurveFi_3(curve).add_liquidity(liquidity, 0);
        }

        _distributePerformanceFeesAndDeposit();
    }
}
