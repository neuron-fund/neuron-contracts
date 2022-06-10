// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.9;

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

import {IPricer} from "../interfaces/IPricer.sol";
import {ICurvePool} from "../interfaces/ICurve.sol";
import {IOracle} from "../interfaces/IOracle.sol";
import "hardhat/console.sol";
contract CRV3Pricer is IPricer {
    address public constant CRV3 = 0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490;

    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;

    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;

    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;

    ICurvePool public constant CURVE_POOL = ICurvePool(0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7);

    AggregatorV3Interface public constant DAI_PRICER =
        AggregatorV3Interface(0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9);

    AggregatorV3Interface public constant USDC_PRICER =
        AggregatorV3Interface(0x3E7d1eAB13ad0104d2750B8863b489D65364e32D);

    AggregatorV3Interface public constant USDT_PRICER =
        AggregatorV3Interface(0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6);

    IOracle public oracle;

    constructor(address _oracle) {
        oracle = IOracle(_oracle);
    }

    function getPrice() external view override returns (uint256) {
        (, int256 daiPrice, , , ) = DAI_PRICER.latestRoundData();
        (, int256 usdcPrice, , , ) = USDC_PRICER.latestRoundData();
        (, int256 usdtPrice, , , ) = USDT_PRICER.latestRoundData();
        return _getPrice(uint256(daiPrice), uint256(usdcPrice), uint256(usdtPrice));
    }

    function _getPrice(
        uint256 daiPrice,
        uint256 usdcPrice,
        uint256 usdtPrice
    ) private view returns (uint256) {
        uint256 minPrice = daiPrice < usdcPrice && daiPrice < usdtPrice
            ? daiPrice
            : usdcPrice < daiPrice && usdcPrice < usdtPrice
            ? usdcPrice
            : usdtPrice;
        return (CURVE_POOL.get_virtual_price() * uint256(minPrice)) / 1e18;
    }

    function setExpiryPriceInOracle(uint256 _expiryTimestamp) external {
        console.log("oracle", address(oracle));
        console.log("_expiryTimestamp", _expiryTimestamp);
        (uint256 daiPriceExpiry, ) = oracle.getExpiryPrice(DAI, _expiryTimestamp);
        require(daiPriceExpiry > 0, "DAI price not set yet");

        (uint256 usdcPriceExpiry, ) = oracle.getExpiryPrice(USDC, _expiryTimestamp);
        require(usdcPriceExpiry > 0, "USDC price not set yet");

        (uint256 usdtPriceExpiry, ) = oracle.getExpiryPrice(USDT, _expiryTimestamp);
        require(usdtPriceExpiry > 0, "USDT price not set yet");

        uint256 price = _getPrice(usdcPriceExpiry, daiPriceExpiry, usdtPriceExpiry);

        oracle.setExpiryPrice(CRV3, _expiryTimestamp, price);
    }
}
