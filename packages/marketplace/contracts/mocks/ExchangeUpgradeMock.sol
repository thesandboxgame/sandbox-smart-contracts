// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {Exchange} from "../Exchange.sol";

contract ExchangeUpgradeMock is Exchange {
    uint256 public newVariable1;
    uint256 public newVariable2;
    address public newVariable3;

    function getNewVariable1() external view returns (uint256) {
        return newVariable1;
    }
}
