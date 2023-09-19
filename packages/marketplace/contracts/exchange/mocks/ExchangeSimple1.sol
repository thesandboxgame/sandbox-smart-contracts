// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {ExchangeSimple} from "./ExchangeSimple.sol";

contract ExchangeSimple1 is ExchangeSimple {
    function getSomething() external pure returns (uint256) {
        return 10;
    }
}
