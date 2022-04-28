// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.2;

import {IPricer} from "../interfaces/IPricer.sol";
import {INeuronPool} from "../interfaces/INeuronPool.sol";

contract NeuronPoolCurve3poolPricer is IPricer {
    INeuronPool public immutable NEURON_POOL;
    IPricer public immutable CRV3_PRICER;

    constructor(address _neuronPool, address _crv3Pricer) {
        NEURON_POOL = INeuronPool(_neuronPool);
        CRV3_PRICER = IPricer(_crv3Pricer);
    }

    function getPrice() external view override returns (uint256) {
        return NEURON_POOL.pricePerShare() * CRV3_PRICER.getPrice() / 1e18;
    }
}
