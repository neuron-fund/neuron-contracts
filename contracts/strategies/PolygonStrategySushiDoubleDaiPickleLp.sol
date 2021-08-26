// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "./PolygonStrategySushiDoubleRewardBase.sol";

contract PolygonStrategySushiDoubleDaiPickleLp is
    PolygonStrategySushiDoubleRewardBase
{
    address public sushi_dai_pickle_lp =
        0x57602582eB5e82a197baE4E8b6B80E39abFC94EB;
    uint256 public sushi_dai_pickle_poolId = 37;
    // Token0
    address public pickle_token = 0x2b88aD57897A8b496595925F43048301C37615Da;
    // Token1
    address public dai = 0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063;

    constructor(
        address _governance,
        address _strategist,
        address _controller,
        address _neuronTokenAddress,
        address _timelock
    )
        PolygonStrategySushiDoubleRewardBase(
            pickle_token,
            dai,
            sushi_dai_pickle_poolId,
            sushi_dai_pickle_lp,
            _governance,
            _strategist,
            _controller,
            _neuronTokenAddress,
            _timelock
        )
    {}

    // **** Views ****

    function getName() external pure override returns (string memory) {
        return "PolygonStrategySushiDoubleDaiPickleLp";
    }
}
