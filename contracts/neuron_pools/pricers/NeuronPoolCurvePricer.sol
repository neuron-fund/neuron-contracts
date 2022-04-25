// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.2;

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

import {IPricer} from "../../interfaces/IPricer.sol";
import {ICurvePool} from "../../interfaces/ICurve.sol";

contract NeuronPoolCurvePricer is IPricer {
    ICurvePool constant CURVE_POOL =
        ICurvePool(0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7);

    AggregatorV3Interface constant DAI_PRICE_FEED =
        AggregatorV3Interface(0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9);
    AggregatorV3Interface constant USDC_PRICE_FEED =
        AggregatorV3Interface(0x3E7d1eAB13ad0104d2750B8863b489D65364e32D);
    AggregatorV3Interface constant USDT_PRICE_FEED =
        AggregatorV3Interface(0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6);

    function getPrice() external view override returns (uint256) {
        (, int256 daiPrice, , , ) = DAI_PRICE_FEED.latestRoundData();
        uint8 daiPriceDecimals = DAI_PRICE_FEED.decimals();
        daiPrice = daiPrice * int256(10**(daiPriceDecimals < 18 ? 18 - daiPriceDecimals : daiPriceDecimals - 18));

        (, int256 usdcPrice, , , ) = USDC_PRICE_FEED.latestRoundData();
        uint8 usdcPriceDecimals = USDC_PRICE_FEED.decimals();
        usdcPrice = usdcPrice * int256(10**(usdcPriceDecimals < 18 ? 18 - usdcPriceDecimals : usdcPriceDecimals - 18));

        (, int256 usdtPrice, , , ) = USDT_PRICE_FEED.latestRoundData();
        uint8 usdtPriceDecimals = USDT_PRICE_FEED.decimals();
        usdtPrice = usdtPrice * int256(10**(usdtPriceDecimals < 18 ? 18 - usdtPriceDecimals : usdtPriceDecimals - 18));

        uint256 curvePoolVirtualPrice = CURVE_POOL.get_virtual_price();

        int256 minPrice = daiPrice < usdcPrice && daiPrice < usdtPrice
            ? daiPrice
            : usdcPrice < daiPrice && usdcPrice < usdtPrice
            ? usdcPrice
            : usdtPrice;
        
        return curvePoolVirtualPrice * uint256(minPrice) / 10**18;
    }
}
