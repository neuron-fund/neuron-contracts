// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.9;

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import {IPricer} from "../interfaces/IPricer.sol";
import {ICurvePool} from "../interfaces/ICurve.sol";
import {INeuronPool} from "../interfaces/INeuronPool.sol";
import {IOracle} from "../interfaces/IOracle.sol";

contract NeuronPoolCurve3crvExtendsPricer is IPricer, Initializable {
    address public constant CRV3 = 0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490;

    address public asset;

    INeuronPool public neuronPool;

    IPricer public crv3Pricer;

    ICurvePool public curvePool;

    address public token;

    AggregatorV3Interface public tokenPriceFeed;

    uint8 public pricePerShareDecimals;

    IOracle public oracle;

    function initialize(
        address _neuronPool,
        address _crv3Pricer,
        address _curvePool,
        address _token,
        address _tokenPriceFeed,
        uint8 _pricePerShareDecimals,
        address _oracle
    ) external initializer {
        asset = _neuronPool;
        neuronPool = INeuronPool(_neuronPool);
        crv3Pricer = IPricer(_crv3Pricer);
        curvePool = ICurvePool(_curvePool);
        token = _token;
        tokenPriceFeed = AggregatorV3Interface(_tokenPriceFeed);
        pricePerShareDecimals = _pricePerShareDecimals;
        oracle = IOracle(_oracle);
    }

    function getPrice() external view override returns (uint256) {
        uint256 crv3Price = crv3Pricer.getPrice();
        (, int256 tokenPrice, , , ) = tokenPriceFeed.latestRoundData();

        return _getPrice(crv3Price, uint256(tokenPrice));
    }

    function _getPrice(uint256 _crv3Price, uint256 _tokenPrice) private view returns (uint256) {
        return
            (neuronPool.pricePerShare() *
                curvePool.get_virtual_price() *
                (_crv3Price < _tokenPrice ? _crv3Price : _tokenPrice)) / (10**(pricePerShareDecimals + 18));
    }

    function setExpiryPriceInOracle(uint256 _expiryTimestamp) external {
        (uint256 crv3PriceExpiry, ) = oracle.getExpiryPrice(CRV3, _expiryTimestamp);

        require(crv3PriceExpiry > 0, "3CRV price not set yet");

        (uint256 tokenPriceExpiry, ) = oracle.getExpiryPrice(token, _expiryTimestamp);

        require(tokenPriceExpiry > 0, "Token price not set yet");

        uint256 price = _getPrice(crv3PriceExpiry, tokenPriceExpiry);

        oracle.setExpiryPrice(asset, _expiryTimestamp, price);
    }
}
