// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.9;

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

import {IPricer} from "../interfaces/IPricer.sol";
import {ICurvePool} from "../interfaces/ICurve.sol";
import {INeuronPool} from "../interfaces/INeuronPool.sol";
import {ITroveManager} from "../interfaces/ITroveManager.sol";

contract NeuronPoolCurveLUSDPricer is IPricer {
    INeuronPool public immutable NEURON_POOL;
    IPricer public immutable CRV3_PRICER;
    ITroveManager public constant TROVE_MANAGER = ITroveManager(0xA39739EF8b0231DbFA0DcdA07d7e29faAbCf4bb2);
    ICurvePool public constant CURVE_POOL = ICurvePool(0xEd279fDD11cA84bEef15AF5D39BB4d4bEE23F0cA);
    uint8 public pricePerShareDecimals;

    constructor(
        address _neuronPool,
        address _crv3Pricer,
        uint8 _pricePerShareDecimals
    ) {
        NEURON_POOL = INeuronPool(_neuronPool);
        CRV3_PRICER = IPricer(_crv3Pricer);
        pricePerShareDecimals = _pricePerShareDecimals;
    }

    function getPrice() external view override returns (uint256) {
        uint256 crv3Price = CRV3_PRICER.getPrice() * 1e10;
        uint256 lusdPrice = 1e18 - TROVE_MANAGER.getRedemptionRate();

        return
            (NEURON_POOL.pricePerShare() *
                CURVE_POOL.get_virtual_price() *
                (crv3Price < lusdPrice ? crv3Price : lusdPrice)) / (10**(pricePerShareDecimals + 28));
    }
    function setExpiryPriceInOracle(uint256 _expiryTimestamp) external {}
}
