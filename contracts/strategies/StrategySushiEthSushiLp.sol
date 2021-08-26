// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "./StrategySushiFarmBase.sol";

contract StrategySushiEthSushiLp is StrategySushiFarmBase {
    // Token/ETH pool id in MasterChef contract
    uint256 public sushi_eth_poolId = 12;
    // Token addresses
    address public sushi_eth_sushi_lp =
        0x795065dCc9f64b5614C407a6EFDC400DA6221FB0;

    constructor(
        address _governance,
        address _strategist,
        address _controller,
        address _neuronTokenAddress,
        address _timelock
    )
        StrategySushiFarmBase(
            sushi,
            sushi_eth_poolId,
            sushi_eth_sushi_lp,
            _governance,
            _strategist,
            _controller,
            _neuronTokenAddress,
            _timelock
        )
    {}

    // **** Views ****

    function getName() external pure override returns (string memory) {
        return "StrategySushiEthSushiLp";
    }
}
