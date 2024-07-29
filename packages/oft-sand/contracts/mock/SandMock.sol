//SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {SandBaseToken} from "../sand/SandBaseToken.sol";

contract SandMock is SandBaseToken {
    constructor(
        address sandAdmin,
        address executionAdmin,
        address beneficiary,
        uint256 amount
    ) SandBaseToken(sandAdmin, executionAdmin, beneficiary, amount) {}
}
