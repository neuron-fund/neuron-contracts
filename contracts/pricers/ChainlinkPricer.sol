// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.9;

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import {IOracle} from "../interfaces/IOracle.sol";
import {IPricer} from "../interfaces/IPricer.sol";
import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @notice A Pricer contract for one asset as reported by Chainlink
 */
contract ChainLinkPricer  {
    using SafeMath for uint256;

    /// @dev base decimals
    uint256 internal constant BASE = 8;

    /// @notice chainlink response decimals
    uint256 public aggregatorDecimals;

    /// @notice the oracle address
    IOracle public oracle;

    /// @notice the aggregator for an asset
    AggregatorV3Interface public aggregator;

    /// @notice asset that this pricer will a get price for
    address public asset;
    /**
     * @param _asset asset that this pricer will get a price for
     * @param _aggregator Chainlink aggregator contract for the asset
     * @param _oracle Oracle address
     */
    constructor(
        address _asset,
        address _aggregator,
        address _oracle
    ) {
        require(_oracle != address(0), "ChainLinkPricer: Cannot set 0 address as oracle");
        require(_aggregator != address(0), "ChainLinkPricer: Cannot set 0 address as aggregator");

        oracle = IOracle(_oracle);
        aggregator = AggregatorV3Interface(_aggregator);
        asset = _asset;

        aggregatorDecimals = uint256(aggregator.decimals());
    }

    /**
     * @notice set the expiry price in the oracle, can only be called by Bot address
     * @dev a roundId must be provided to confirm price validity, which is the first Chainlink price provided after the expiryTimestamp
     * @param _expiryTimestamp expiry to set a price for
     * @param _roundId the first roundId after expiryTimestamp
     */
    function setExpiryPriceInOracle(uint256 _expiryTimestamp, uint80 _roundId) external {
        (, int256 price, , uint256 roundTimestamp, ) = aggregator.getRoundData(_roundId);

        require(_expiryTimestamp <= roundTimestamp, "ChainLinkPricer: roundId not first after expiry");
        require(price >= 0, "ChainLinkPricer: invalid price");

        bool isCorrectRoundId;
        uint80 previousRoundId = uint80(uint256(_roundId).sub(1));

        while (!isCorrectRoundId) {
            (, , , uint256 previousRoundTimestamp, ) = aggregator.getRoundData(previousRoundId);

            if (previousRoundTimestamp == 0) {
                require(previousRoundId > 0, "ChainLinkPricer: Invalid previousRoundId");
                previousRoundId = previousRoundId - 1;
            } else if (previousRoundTimestamp > _expiryTimestamp) {
                revert("ChainLinkPricer: previousRoundId not last before expiry");
            } else {
                isCorrectRoundId = true;
            }
        }

        oracle.setExpiryPrice(asset, _expiryTimestamp, uint256(price));
    }

    /**
     * @notice get the live price for the asset
     * @dev overides the getPrice function in IPricer
     * @return price of the asset in USD, scaled by 1e8
     */
    function getPrice() external view returns (uint256) {
        (, int256 answer, , , ) = aggregator.latestRoundData();
        require(answer > 0, "ChainLinkPricer: price is lower than 0");
        // chainlink's answer is already 1e8
        return _scaleToBase(uint256(answer));
    }

    /**
     * @notice scale aggregator response to base decimals (1e8)
     * @param _price aggregator price
     * @return price scaled to 1e8
     */
    function _scaleToBase(uint256 _price) internal view returns (uint256) {
        if (aggregatorDecimals > BASE) {
            uint256 exp = aggregatorDecimals.sub(BASE);
            _price = _price.div(10**exp);
        } else if (aggregatorDecimals < BASE) {
            uint256 exp = BASE.sub(aggregatorDecimals);
            _price = _price.mul(10**exp);
        }

        return _price;
    }
}
