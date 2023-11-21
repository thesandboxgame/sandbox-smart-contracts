// SPDX-License-Identifier: MIT
// solhint-disable code-complexity
pragma solidity ^0.8.0;

/**
 * @title  MockOperatorFilterRegistry
 * @notice Made based on the OperatorFilterRegistry of OpenSea at https://github.com/ProjectOpenSea/operator-filter-registry/blob/main/src/OperatorFilterRegistry.sol
 * @notice This contracts allows tokens or token owners to register specific addresses or codeHashes that may be
 * *       restricted according to the isOperatorAllowed function.
 */
contract MockOperatorFilterRegistry {
    mapping(address => address) private _registrations;

    function register(address registrant) external {
        if (_registrations[registrant] != address(0)) {
            revert("AlreadyRegistered");
        }
        _registrations[registrant] = registrant;
    }

    function registerSubscription(address registrant, address subscription) external {
        _registrations[registrant] = subscription;
    }

    /**
     * @notice Returns true if an address has registered
     */
    function isRegistered(address registrant) external view returns (bool) {
        return _registrations[registrant] != address(0);
    }

    function subscriptionOf(address registrant) external view returns (address subscription) {
        subscription = _registrations[registrant];
        if (subscription == address(0)) {
            revert("NotRegistered");
        } else if (subscription == registrant) {
            subscription = address(0);
        }
    }
}
