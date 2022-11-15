// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

contract OperatorFilterRegistryEvents {
    event RegistrationUpdated(address indexed registrant, bool indexed registered);

    event OperatorUpdated(address indexed registrant, address indexed operator, bool indexed filtered);

    event OperatorsUpdated(address indexed registrant, address[] operators, bool indexed filtered);

    event CodeHashUpdated(address indexed registrant, bytes32 indexed codeHash, bool indexed filtered);

    event CodeHashesUpdated(address indexed registrant, bytes32[] codeHashes, bool indexed filtered);

    event SubscriptionUpdated(address indexed registrant, address indexed subscription, bool indexed subscribed);
}
