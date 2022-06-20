// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.9;

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import {IOracle} from "../interfaces/IOracle.sol";
import {IPricer} from "../interfaces/IPricer.sol";
import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract ChainLinkPricerRen {
    /// @notice asset that this pricer will a get price for
    address public constant asset = 0xEB4C2781e4ebA804CE9a9803C67d0893436bB27D;

    AggregatorV3Interface public constant aggregator = AggregatorV3Interface(0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c);

    /// @notice the oracle address
    IOracle public oracle;

    /// @notice bot address that is allowed to call setExpiryPriceInOracle
    address public bot;

    /**
     * @param _bot priveleged address that can call setExpiryPriceInOracle
     * @param _oracle Oracle address
     */
    constructor(address _bot, address _oracle) {
        require(_bot != address(0), "ChainLinkPricer: Cannot set 0 address as bot");
        require(_oracle != address(0), "ChainLinkPricer: Cannot set 0 address as oracle");

        bot = _bot;
        oracle = IOracle(_oracle);
    }

    /**
     * @notice modifier to check if sender address is equal to bot address
     */
    modifier onlyBot() {
        require(msg.sender == bot, "ChainLinkPricer: unauthorized sender");

        _;
    }

    /**
     * @notice set the expiry price in the oracle, can only be called by Bot address
     * @dev a roundId must be provided to confirm price validity, which is the first Chainlink price provided after the expiryTimestamp
     * @param _expiryTimestamp expiry to set a price for
     * @param _roundId the first roundId after expiryTimestamp
     */
    function setExpiryPriceInOracle(uint256 _expiryTimestamp, uint80 _roundId) external onlyBot {
        (, int256 btcPrice, , uint256 btcRoundTimestamp, ) = aggregator.getRoundData(_roundId);

        require(_expiryTimestamp <= btcRoundTimestamp, "ChainLinkPricer BTC/USD: invalid roundId");

        oracle.setExpiryPrice(asset, _expiryTimestamp, _getRenPrice(uint256(btcPrice)));
    }

     function _getRenPrice(uint256 _btcPrice) internal pure returns (uint256) {
        return (_btcPrice * 9985) / 10000;
     }

    /**
     * @notice get the live price for the asset
     * @dev overides the getPrice function in IPricer
     * @return price of the asset in USD, scaled by 1e8
     */
    function getPrice() external view returns (uint256) {
        (, int256 btcPrice, , , ) = aggregator.latestRoundData();

        uint256 renPrice = _getRenPrice(uint256(btcPrice));

        require(renPrice > 0, "ChainLinkPricer: price is lower than 0");

        return renPrice;
    }
}
