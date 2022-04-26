// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.2;

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import {IPricer} from "../interfaces/IPricer.sol";
import {ICurvePool} from "../interfaces/ICurve.sol";
import {INeuronPool} from "../interfaces/INeuronPool.sol";
import "hardhat/console.sol";

contract NeuronPoolCurve3crvExtendsPricer is IPricer, Initializable {
    INeuronPool public neuronPool;
    IPricer public crv3Pricer;
    ICurvePool public curvePool;
    AggregatorV3Interface public tokenPriceFeed;

    function initialize(
        address _neuronPool,
        address _crv3Pricer,
        address _curvePool,
        address _tokenPriceFeed
    ) external initializer {
        neuronPool = INeuronPool(_neuronPool);
        crv3Pricer = IPricer(_crv3Pricer);
        curvePool = ICurvePool(_curvePool);
        tokenPriceFeed = AggregatorV3Interface(_tokenPriceFeed);
    }

    function getPrice() external view override returns (uint256) {
        uint256 crv3Price = crv3Pricer.getPrice();
        (, int256 rawPrice, , , ) = tokenPriceFeed.latestRoundData();
        uint256 tokenPrice = uint256(rawPrice);
        return neuronPool.pricePerShare() * (crv3Price < tokenPrice ? crv3Price : tokenPrice) / 1e8;
    }
}
