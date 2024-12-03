// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import {RoyaltyManagerMock} from "@sandbox-smart-contracts/land/contracts/mock/RoyaltyManagerMock.sol";

contract RoyaltyManagerExchangeMock is RoyaltyManagerMock {
    constructor(address payable _commonRecipient) RoyaltyManagerMock(_commonRecipient) {}
}
