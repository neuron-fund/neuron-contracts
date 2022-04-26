// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.2;

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

import {IPricer} from "../interfaces/IPricer.sol";
import {ICurvePool} from "../interfaces/ICurve.sol";
import {INeuronPool} from "../interfaces/INeuronPool.sol";

contract NeuronPoolCurveMIMUSTPricer is IPricer {
    INeuronPool immutable NEURON_POOL;

    ICurvePool constant CURVE_POOL =
        ICurvePool(0x55A8a39bc9694714E2874c1ce77aa1E599461E18);
    AggregatorV3Interface public constant MIM_PRICE_FEED =
        AggregatorV3Interface(0x7A364e8770418566e3eb2001A96116E6138Eb32F);
    AggregatorV3Interface public constant UST_PRICE_FEED =
        AggregatorV3Interface(0x8b6d9085f310396C6E4f0012783E9f850eaa8a82);

    constructor(address _neuronPool) {
        NEURON_POOL = INeuronPool(_neuronPool);
    }

    function getPrice() external view override returns (uint256) {
        (, int256 mimPrice, , , ) = MIM_PRICE_FEED.latestRoundData();
        (, int256 ustPrice, , , ) = UST_PRICE_FEED.latestRoundData();

        return
            NEURON_POOL.pricePerShare() * (CURVE_POOL.get_virtual_price() *
                uint256(mimPrice < ustPrice ? mimPrice : ustPrice)) / 1e26;
    }
}
