// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.9;

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import {IPricer} from "../interfaces/IPricer.sol";
import {ICurvePool} from "../interfaces/ICurve.sol";
import {INeuronPool} from "../interfaces/INeuronPool.sol";
import {IOracle} from "../interfaces/IOracle.sol";

contract NeuronPoolCurveTokenEthExtendsPricer is IPricer, Initializable {
    AggregatorV3Interface public constant ETH_PRICER = AggregatorV3Interface(0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419);

    address public constant ETH = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    address public asset;

    INeuronPool public neuronPool;

    ICurvePool public curvePool;

    address public token;

    AggregatorV3Interface public tokenPriceFeed;

    uint8 public pricePerShareDecimals;

    IOracle public oracle;

    function initialize(
        address _neuronPool,
        address _curvePool,
        address _token,
        address _tokenPriceFeed,
        uint8 _pricePerShareDecimals,
        address _oracle
    ) external initializer {
        asset = _neuronPool;
        neuronPool = INeuronPool(_neuronPool);
        curvePool = ICurvePool(_curvePool);
        token = _token;
        tokenPriceFeed = AggregatorV3Interface(_tokenPriceFeed);
        pricePerShareDecimals = _pricePerShareDecimals;
        oracle = IOracle(_oracle);
    }

    function getPrice() external view override returns (uint256) {
        (, int256 tokenPrice, , , ) = tokenPriceFeed.latestRoundData();

        (, int256 ethPrice, , , ) = ETH_PRICER.latestRoundData();


        return _getPrice(uint256(tokenPrice), uint256(ethPrice));
    }

    function _getPrice(uint256 _tokenPrice, uint256 _ethPrice) private view returns (uint256) {
        return
            (neuronPool.pricePerShare() *
                curvePool.get_virtual_price() *
                (_tokenPrice < _ethPrice ? _tokenPrice : _ethPrice)) /
            (10**(pricePerShareDecimals + 18));
    }

    function setExpiryPriceInOracle(uint256 _expiryTimestamp) external {
        (uint256 tokenPriceExpiry, ) = oracle.getExpiryPrice(token, _expiryTimestamp);

        require(tokenPriceExpiry > 0, "Token price not set yet");

        (uint256 ethPriceExpiry, ) = oracle.getExpiryPrice(ETH, _expiryTimestamp);

        require(ethPriceExpiry > 0, "ETH price not set yet");

        uint256 price = _getPrice(tokenPriceExpiry, ethPriceExpiry);

        oracle.setExpiryPrice(asset, _expiryTimestamp, price);
    }
}
