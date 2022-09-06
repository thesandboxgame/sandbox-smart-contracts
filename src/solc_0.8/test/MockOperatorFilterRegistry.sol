// SPDX-License-Identifier: MIT
// solhint-disable code-complexity
pragma solidity 0.8.2;

import {IOperatorFilterRegistry} from "../OperatorFilterer/interfaces/IOperatorFilterRegistry.sol";
import {Ownable} from "@openzeppelin/contracts-0.8/access/Ownable.sol";
import {EnumerableSet} from "@openzeppelin/contracts-0.8/utils/structs/EnumerableSet.sol";
import {OperatorFilterRegistryEvents} from "./OperatorFilterRegistryEvents.sol";

/**
 * @title  MockOperatorFilterRegistry
 * @notice Made based on the OperatorFilterRegistry of openSea at https://github.com/ProjectOpenSea/operator-filter-registry/blob/main/src/OperatorFilterRegistry.sol
 * @notice This contracts allows tokens or token owners to register specific addresses or codeHashes that may be
 * *       restricted according to the isOperatorAllowed function.
 */
contract MockOperatorFilterRegistry is IOperatorFilterRegistry, OperatorFilterRegistryEvents {
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.Bytes32Set;

    /// @dev initialized accounts have a nonzero codehash (see https://eips.ethereum.org/EIPS/eip-1052)
    /// Note that this will also be a smart contract's codehash when making calls from its constructor.
    bytes32 public constant EOA_CODEHASH = keccak256("");

    mapping(address => EnumerableSet.AddressSet) private _filteredOperators;
    mapping(address => EnumerableSet.Bytes32Set) private _filteredCodeHashes;
    mapping(address => address) private _registrations;
    mapping(address => EnumerableSet.AddressSet) private _subscribers;

    constructor(address _defaultSubscribtion, address[] memory _blacklistedAddresses) {
        _registrations[_defaultSubscribtion] = _defaultSubscribtion;
        EnumerableSet.AddressSet storage filteredOperatorsRef = _filteredOperators[_defaultSubscribtion];
        EnumerableSet.Bytes32Set storage filteredCodeHashesRef = _filteredCodeHashes[_defaultSubscribtion];
        for (uint256 i; i < _blacklistedAddresses.length; i++) {
            filteredOperatorsRef.add(_blacklistedAddresses[i]);
            bytes32 codeHash = _blacklistedAddresses[i].codehash;
            filteredCodeHashesRef.add(codeHash);
        }
    }

    /**
     * @notice restricts method caller to the address or EIP-173 "owner()"
     */
    modifier onlyAddressOrOwner(address addr) {
        if (msg.sender != addr) {
            try Ownable(addr).owner() returns (address owner) {
                if (msg.sender != owner) {
                    revert("Only Address or Owner");
                }
            } catch (bytes memory reason) {
                if (reason.length == 0) {
                    revert("Not Ownable");
                } else {
                    /// @solidity memory-safe-assembly
                    assembly {
                        revert(add(32, reason), mload(reason))
                    }
                }
            }
        }
        _;
    }

    /**
     * @notice Returns true if operator is not filtered for a given token, either by address or codeHash. Also returns
     *         true if supplied registrant address is not registered.
     */
    function isOperatorAllowed(address registrant, address operator) external view override returns (bool) {
        address registration = _registrations[registrant];
        if (registration != address(0)) {
            EnumerableSet.AddressSet storage filteredOperatorsRef;
            EnumerableSet.Bytes32Set storage filteredCodeHashesRef;

            filteredOperatorsRef = _filteredOperators[registration];
            filteredCodeHashesRef = _filteredCodeHashes[registration];

            if (filteredOperatorsRef.contains(operator)) {
                revert("Address is filtered");
            }
            if (operator.code.length > 0) {
                bytes32 codeHash = operator.codehash;
                if (filteredCodeHashesRef.contains(codeHash)) {
                    revert("Codehash is filtered");
                }
            }
        }
        return true;
    }

    //////////////////
    // AUTH METHODS //
    //////////////////

    /**
     * @notice Registers an address with the registry. May be called by address itself or by EIP-173 owner.
     */
    function register(address registrant) external override onlyAddressOrOwner(registrant) {
        if (_registrations[registrant] != address(0)) {
            revert("Already registered");
        }
        _registrations[registrant] = registrant;
        emit RegistrationUpdated(registrant, true);
    }

    /**
     * @notice Unregisters an address with the registry and removes its subscription. May be called by address itself or by EIP-173 owner.
     *         Note that this does not remove any filtered addresses or codeHashes.
     *         Also note that any subscriptions to this registrant will still be active and follow the existing filtered addresses and codehashes.
     */
    function unregister(address registrant) external onlyAddressOrOwner(registrant) {
        address registration = _registrations[registrant];
        if (registration == address(0)) {
            revert("Not registered");
        }
        if (registration != registrant) {
            _subscribers[registration].remove(registrant);
            emit SubscriptionUpdated(registrant, registration, false);
        }
        _registrations[registrant] = address(0);
        emit RegistrationUpdated(registrant, false);
    }

    /**
     * @notice Registers an address with the registry and "subscribes" to another address's filtered operators and codeHashes.
     */
    function registerAndSubscribe(address registrant, address subscription)
        external
        override
        onlyAddressOrOwner(registrant)
    {
        address registration = _registrations[registrant];
        if (registration != address(0)) {
            revert("Already registered");
        }
        if (registrant == subscription) {
            revert("Cannot subscribe to self");
        }
        address subscriptionRegistration = _registrations[subscription];
        if (subscriptionRegistration == address(0)) {
            revert("Subscribtion not registered");
        }
        if (subscriptionRegistration != subscription) {
            revert("Cannot subscribe to registrant with subscribtion");
        }

        _registrations[registrant] = subscription;
        _subscribers[subscription].add(registrant);
        emit RegistrationUpdated(registrant, true);
        emit SubscriptionUpdated(registrant, subscription, true);
    }

    /**
     * @notice Registers an address with the registry and copies the filtered operators and codeHashes from another
     *         address without subscribing.
     */
    function registerAndCopyEntries(address registrant, address registrantToCopy)
        external
        override
        onlyAddressOrOwner(registrant)
    {
        if (registrantToCopy == registrant) {
            revert("Cannot copy from self");
        }
        address registration = _registrations[registrant];
        if (registration != address(0)) {
            revert("Already registered");
        }
        address registrantRegistration = _registrations[registrantToCopy];
        if (registrantRegistration == address(0)) {
            revert("Registrant to copy from not registered");
        }
        _registrations[registrant] = registrant;
        emit RegistrationUpdated(registrant, true);
        _copyEntries(registrant, registrantToCopy);
    }

    /**
     * @notice Update an operator address for a registered address - when filtered is true, the operator is filtered.
     */
    function updateOperator(
        address registrant,
        address operator,
        bool filtered
    ) external override onlyAddressOrOwner(registrant) {
        address registration = _registrations[registrant];
        if (registration == address(0)) {
            revert("Not registered");
        }
        if (registration != registrant) {
            revert("Cannot update while subscribed");
        }
        EnumerableSet.AddressSet storage filteredOperatorsRef = _filteredOperators[registrant];

        if (!filtered) {
            bool removed = filteredOperatorsRef.remove(operator);
            if (!removed) {
                revert("Address not filtered");
            }
        } else {
            bool added = filteredOperatorsRef.add(operator);
            if (!added) {
                revert("Address already filtered");
            }
        }
        emit OperatorUpdated(registrant, operator, filtered);
    }

    /**
     * @notice Update a codeHash for a registered address - when filtered is true, the codeHash is filtered.
     */
    function updateCodeHash(
        address registrant,
        bytes32 codeHash,
        bool filtered
    ) external override onlyAddressOrOwner(registrant) {
        if (codeHash == EOA_CODEHASH) {
            revert("Cannot filter EOAs");
        }
        address registration = _registrations[registrant];
        if (registration == address(0)) {
            revert("Not registered");
        }
        if (registration != registrant) {
            revert("Cannot update while subscribed");
        }
        EnumerableSet.Bytes32Set storage filteredCodeHashesRef = _filteredCodeHashes[registrant];

        if (!filtered) {
            bool removed = filteredCodeHashesRef.remove(codeHash);
            if (!removed) {
                revert("Codehash not filtered");
            }
        } else {
            bool added = filteredCodeHashesRef.add(codeHash);
            if (!added) {
                revert("Codehash already filtered");
            }
        }
        emit CodeHashUpdated(registrant, codeHash, filtered);
    }

    /**
     * @notice Update multiple operators for a registered address - when filtered is true, the operators will be filtered. Reverts on duplicates.
     */
    function updateOperators(
        address registrant,
        address[] calldata operators,
        bool filtered
    ) external override onlyAddressOrOwner(registrant) {
        address registration = _registrations[registrant];
        if (registration == address(0)) {
            revert("Not registered");
        }
        if (registration != registrant) {
            revert("Cannot update while subscribed");
        }
        EnumerableSet.AddressSet storage filteredOperatorsRef = _filteredOperators[registrant];
        uint256 operatorsLength = operators.length;
        unchecked {
            if (!filtered) {
                for (uint256 i = 0; i < operatorsLength; ++i) {
                    address operator = operators[i];
                    bool removed = filteredOperatorsRef.remove(operator);
                    if (!removed) {
                        revert("Address not filtered");
                    }
                }
            } else {
                for (uint256 i = 0; i < operatorsLength; ++i) {
                    address operator = operators[i];
                    bool added = filteredOperatorsRef.add(operator);
                    if (!added) {
                        revert("Address already filtered");
                    }
                }
            }
        }
        emit OperatorsUpdated(registrant, operators, filtered);
    }

    /**
     * @notice Update multiple codeHashes for a registered address - when filtered is true, the codeHashes will be filtered. Reverts on duplicates.
     */
    function updateCodeHashes(
        address registrant,
        bytes32[] calldata codeHashes,
        bool filtered
    ) external override onlyAddressOrOwner(registrant) {
        address registration = _registrations[registrant];
        if (registration == address(0)) {
            revert("Not registered");
        }
        if (registration != registrant) {
            revert("Cannot update while subscribed");
        }
        EnumerableSet.Bytes32Set storage filteredCodeHashesRef = _filteredCodeHashes[registrant];
        uint256 codeHashesLength = codeHashes.length;
        unchecked {
            if (!filtered) {
                for (uint256 i = 0; i < codeHashesLength; ++i) {
                    bytes32 codeHash = codeHashes[i];
                    bool removed = filteredCodeHashesRef.remove(codeHash);
                    if (!removed) {
                        revert("Codehash not filtered");
                    }
                }
            } else {
                for (uint256 i = 0; i < codeHashesLength; ++i) {
                    bytes32 codeHash = codeHashes[i];
                    if (codeHash == EOA_CODEHASH) {
                        revert("Cannot filter EOAs");
                    }
                    bool added = filteredCodeHashesRef.add(codeHash);
                    if (!added) {
                        revert("Codehash already filtered");
                    }
                }
            }
        }
        emit CodeHashesUpdated(registrant, codeHashes, filtered);
    }

    /**
     * @notice Subscribe an address to another registrant's filtered operators and codeHashes. Will remove previous
     *         subscription if present.
     *         Note that accounts with subscriptions may go on to subscribe to other accounts - in this case,
     *         subscriptions will not be forwarded. Instead the former subscription's existing entries will still be
     *         used.
     */
    function subscribe(address registrant, address newSubscription) external override onlyAddressOrOwner(registrant) {
        if (registrant == newSubscription) {
            revert("Cannot subscribe to self");
        }
        if (newSubscription == address(0)) {
            revert("Cannot subscribe to zero address");
        }
        address registration = _registrations[registrant];
        if (registration == address(0)) {
            revert("Not registered");
        }
        if (registration == newSubscription) {
            revert("Already subscribed");
        }
        address newSubscriptionRegistration = _registrations[newSubscription];
        if (newSubscriptionRegistration == address(0)) {
            revert("New subscription not registered");
        }
        if (newSubscriptionRegistration != newSubscription) {
            revert("Cannot Subscribe to registrant with subscription");
        }

        if (registration != registrant) {
            _subscribers[registration].remove(registrant);
            emit SubscriptionUpdated(registrant, registration, false);
        }
        _registrations[registrant] = newSubscription;
        _subscribers[newSubscription].add(registrant);
        emit SubscriptionUpdated(registrant, newSubscription, true);
    }

    /**
     * @notice Unsubscribe an address from its current subscribed registrant, and optionally copy its filtered operators and codeHashes.
     */
    function unsubscribe(address registrant, bool copyExistingEntries)
        external
        override
        onlyAddressOrOwner(registrant)
    {
        address registration = _registrations[registrant];
        if (registration == address(0)) {
            revert("Not registered");
        }
        if (registration == registrant) {
            revert("Not subscribed");
        }
        _subscribers[registration].remove(registrant);
        _registrations[registrant] = registrant;
        emit SubscriptionUpdated(registrant, registration, false);
        if (copyExistingEntries) {
            _copyEntries(registrant, registration);
        }
    }

    /**
     * @notice Copy filtered operators and codeHashes from a different registrantToCopy to addr.
     */
    function copyEntriesOf(address registrant, address registrantToCopy)
        external
        override
        onlyAddressOrOwner(registrant)
    {
        if (registrant == registrantToCopy) {
            revert("Cannot copy from self");
        }
        address registration = _registrations[registrant];
        if (registration == address(0)) {
            revert("Not registered");
        }
        if (registration != registrant) {
            revert("Cannot upgrade while subscribed");
        }
        address registrantRegistration = _registrations[registrantToCopy];
        if (registrantRegistration == address(0)) {
            revert("Registrant not registered");
        }
        _copyEntries(registrant, registrantToCopy);
    }

    /// @dev helper to copy entries from registrantToCopy to registrant and emit events
    function _copyEntries(address registrant, address registrantToCopy) private {
        EnumerableSet.AddressSet storage filteredOperatorsRef = _filteredOperators[registrantToCopy];
        EnumerableSet.Bytes32Set storage filteredCodeHashesRef = _filteredCodeHashes[registrantToCopy];
        uint256 filteredOperatorsLength = filteredOperatorsRef.length();
        uint256 filteredCodeHashesLength = filteredCodeHashesRef.length();
        unchecked {
            for (uint256 i = 0; i < filteredOperatorsLength; ++i) {
                address operator = filteredOperatorsRef.at(i);
                bool added = _filteredOperators[registrant].add(operator);
                if (added) {
                    emit OperatorUpdated(registrant, operator, true);
                }
            }
            for (uint256 i = 0; i < filteredCodeHashesLength; ++i) {
                bytes32 codehash = filteredCodeHashesRef.at(i);
                bool added = _filteredCodeHashes[registrant].add(codehash);
                if (added) {
                    emit CodeHashUpdated(registrant, codehash, true);
                }
            }
        }
    }

    //////////////////
    // VIEW METHODS //
    //////////////////

    /**
     * @notice Get the subscription address of a given registrant, if any.
     */
    function subscriptionOf(address registrant) external view override returns (address subscription) {
        subscription = _registrations[registrant];
        if (subscription == address(0)) {
            revert("Not registered");
        } else if (subscription == registrant) {
            subscription = address(0);
        }
    }

    /**
     * @notice Get the set of addresses subscribed to a given registrant.
     *         Note that order is not guaranteed as updates are made.
     */
    function subscribers(address registrant) external view override returns (address[] memory) {
        return _subscribers[registrant].values();
    }

    /**
     * @notice Get the subscriber at a given index in the set of addresses subscribed to a given registrant.
     *         Note that order is not guaranteed as updates are made.
     */
    function subscriberAt(address registrant, uint256 index) external view override returns (address) {
        return _subscribers[registrant].at(index);
    }

    /**
     * @notice Returns true if operator is filtered by a given address or its subscription.
     */
    function isOperatorFiltered(address registrant, address operator) external view override returns (bool) {
        address registration = _registrations[registrant];
        if (registration != registrant) {
            return _filteredOperators[registration].contains(operator);
        }
        return _filteredOperators[registrant].contains(operator);
    }

    /**
     * @notice Returns true if a codeHash is filtered by a given address or its subscription.
     */
    function isCodeHashFiltered(address registrant, bytes32 codeHash) external view override returns (bool) {
        address registration = _registrations[registrant];
        if (registration != registrant) {
            return _filteredCodeHashes[registration].contains(codeHash);
        }
        return _filteredCodeHashes[registrant].contains(codeHash);
    }

    /**
     * @notice Returns true if the hash of an address's code is filtered by a given address or its subscription.
     */
    function isCodeHashOfFiltered(address registrant, address operatorWithCode) external view override returns (bool) {
        bytes32 codeHash = operatorWithCode.codehash;
        address registration = _registrations[registrant];
        if (registration != registrant) {
            return _filteredCodeHashes[registration].contains(codeHash);
        }
        return _filteredCodeHashes[registrant].contains(codeHash);
    }

    /**
     * @notice Returns true if an address has registered
     */
    function isRegistered(address registrant) external view override returns (bool) {
        return _registrations[registrant] != address(0);
    }

    /**
     * @notice Returns a list of filtered operators for a given address or its subscription.
     */
    function filteredOperators(address registrant) external view override returns (address[] memory) {
        address registration = _registrations[registrant];
        if (registration != registrant) {
            return _filteredOperators[registration].values();
        }
        return _filteredOperators[registrant].values();
    }

    /**
     * @notice Returns the set of filtered codeHashes for a given address or its subscription.
     *         Note that order is not guaranteed as updates are made.
     */
    function filteredCodeHashes(address registrant) external view override returns (bytes32[] memory) {
        address registration = _registrations[registrant];
        if (registration != registrant) {
            return _filteredCodeHashes[registration].values();
        }
        return _filteredCodeHashes[registrant].values();
    }

    /**
     * @notice Returns the filtered operator at the given index of the set of filtered operators for a given address or
     *         its subscription.
     *         Note that order is not guaranteed as updates are made.
     */
    function filteredOperatorAt(address registrant, uint256 index) external view override returns (address) {
        address registration = _registrations[registrant];
        if (registration != registrant) {
            return _filteredOperators[registration].at(index);
        }
        return _filteredOperators[registrant].at(index);
    }

    /**
     * @notice Returns the filtered codeHash at the given index of the list of filtered codeHashes for a given address or
     *         its subscription.
     *         Note that order is not guaranteed as updates are made.
     */
    function filteredCodeHashAt(address registrant, uint256 index) external view override returns (bytes32) {
        address registration = _registrations[registrant];
        if (registration != registrant) {
            return _filteredCodeHashes[registration].at(index);
        }
        return _filteredCodeHashes[registrant].at(index);
    }

    /// @dev Convenience method to compute the code hash of an arbitrary contract
    function codeHashOf(address a) external view override returns (bytes32) {
        return a.codehash;
    }
}
