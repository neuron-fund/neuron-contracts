// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.2;

import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import {IPricer} from "../interfaces/IPricer.sol";
import {INeuronPool} from "../interfaces/INeuronPool.sol";

contract NeuronPoolCurve3poolPricer is IPricer {
    INeuronPool public neuronPool;
    IPricer public immutable CRV3_PRICER;
    uint8 public pricePerShareDecimals;

    constructor(address _neuronPool, address _crv3Pricer) {
        neuronPool = INeuronPool(_neuronPool);
        CRV3_PRICER = IPricer(_crv3Pricer);
        pricePerShareDecimals = IERC20Metadata(neuronPool.token()).decimals();
    }

    function getPrice() external view override returns (uint256) {
        return neuronPool.pricePerShare() * CRV3_PRICER.getPrice() / 10 ** pricePerShareDecimals;
    }
}
