// SPDX-License-Identifier: MIT
// solhint-disable one-contract-per-file
pragma solidity 0.8.26;

/**
 * @title UpdatableOperatorFiltererUpgradeable
 * @author The Sandbox
 * @custom:security-contact contact-blockchain@sandbox.game
 * @notice This contract would subscribe or copy or just to the subscription provided or just register to
 *          default subscription list
 * @dev This contract is the upgradeable version of the OpenSea implementation
 *      https://github.com/ProjectOpenSea/operator-filter-registry/blob/main/src/OperatorFilterer.sol
 *      and adapted to the 0.5.9 solidity version
 *      To avoid an extra IOperatorFilterRegistry file for a code that is deprecated the interface is added below
 */
abstract contract UpdatableOperatorFiltererUpgradeable {
    struct UpdatableOperatorFiltererUpgradeableStorage {
        /**
         * @notice the registry filter
         */
        IOperatorFilterRegistry operatorFilterRegistry;
    }

    /// @custom:storage-location erc7201:thesandbox.storage.avatar.nft-collection.UpdatableOperatorFiltererUpgradeable
    bytes32 internal constant UPDATABLE_OPERATOR_FILTERER_UPGRADABLE_STORAGE_LOCATION =
    0x71a93d37b91262fe5ff5f64b534078b04fa3ca1f04b63abeac7b60ede712e800;

    function _getUpdatableOperatorFiltererUpgradeableStorage() private pure returns (UpdatableOperatorFiltererUpgradeableStorage storage $) {
        // solhint-disable-next-line no-inline-assembly
        assembly {
            $.slot := UPDATABLE_OPERATOR_FILTERER_UPGRADABLE_STORAGE_LOCATION
        }
    }

    /**
     * @notice emitted when a registry is set
     * @param operator the sender of the transaction
     * @param oldRegistry address of the old registry
     * @param newRegistry address of the new registry to set
     */
    event OperatorRegistrySet(address indexed operator, IOperatorFilterRegistry indexed oldRegistry, address indexed newRegistry);

    /**
     * @notice emitted when the contract is registered into the registry
     * @param operator the sender of the transaction
     * @param registry address of the registry to set
     * @param subscriptionOrRegistrant address to subscribe or copy entries from
     * @param subscribe should it subscribe
     */
    event ContractRegistered(
        address indexed operator,
        IOperatorFilterRegistry indexed registry,
        address indexed subscriptionOrRegistrant,
        bool subscribe
    );

    /**
     * @notice the caller is not the operator
     * @param operator that does the call
     */
    error OperatorNotAllowed(address operator);

    /**
     * @notice the registry is not configured
     * @param operator that does the call
     */
    error RegistryNotSet(address operator);

    /**
     * @notice this contract is already registered
     * @param operator that does the call
     */
    error AlreadyRegistered(address operator);

    /**
     * @notice Used in approval operations to check if the operator is allowed to call this contract
     * @param operator The address receiving the approval
     */
    modifier onlyAllowedOperatorApproval(address operator) virtual {
        _checkIsOperatorAllowed(address(this), operator);
        _;
    }

    /**
     * @notice Used in transfer from operations to check if the sender of the token is allowed to call this contract
     * @param from the sender of the token
     */
    modifier onlyAllowedOperator(address from) virtual {
        // Allow spending tokens from addresses with balance (from == _msgSender())
        // Note that this still allows listings and marketplaces with escrow to transfer tokens if transferred
        // from an EOA.
        if (from != _msgSender()) {
            _checkIsOperatorAllowed(address(this), _msgSender());
        }
        _;
    }

    /**
     * @notice return the operatorFilterRegistry address
     */
    function operatorFilterRegistry() external view returns (IOperatorFilterRegistry) {
        UpdatableOperatorFiltererUpgradeableStorage storage $ = _getUpdatableOperatorFiltererUpgradeableStorage();
        return $.operatorFilterRegistry;
    }

    /**
     * @notice Register this contract into the registry
     * @param subscriptionOrRegistrantToCopy address to subscribe or copy entries from
     * @param subscribe should it subscribe
     */
    function _register(address subscriptionOrRegistrantToCopy, bool subscribe) internal {
        UpdatableOperatorFiltererUpgradeableStorage storage $ = _getUpdatableOperatorFiltererUpgradeableStorage();
        IOperatorFilterRegistry registry = $.operatorFilterRegistry;
        bool isContract = address(registry).code.length > 0;
        if (!isContract) {
            revert RegistryNotSet(_msgSender());
        }
        if (registry.isRegistered(address(this))) {
            revert AlreadyRegistered(_msgSender());
        }

        if (subscribe) {
            registry.registerAndSubscribe(address(this), subscriptionOrRegistrantToCopy);
        } else if (subscriptionOrRegistrantToCopy != address(0)) {
            registry.registerAndCopyEntries(address(this), subscriptionOrRegistrantToCopy);
        } else {
            registry.register(address(this));
        }
        emit ContractRegistered(_msgSender(), registry, subscriptionOrRegistrantToCopy, subscribe);
    }

    /**
     * @notice sets filter registry address deployed in test
     * @param registry the address of the registry
     * @dev address(0) disables the registry
     */
    function _setOperatorRegistry(address registry) internal {
        UpdatableOperatorFiltererUpgradeableStorage storage $ = _getUpdatableOperatorFiltererUpgradeableStorage();
        emit OperatorRegistrySet(_msgSender(), $.operatorFilterRegistry, registry);
        $.operatorFilterRegistry = IOperatorFilterRegistry(registry);
    }

    /**
     * @notice Check if the operator is allowed for the given registrant
     * @param registrant address of the registrant
     * @param operator operator address to check
     */
    function _checkIsOperatorAllowed(address registrant, address operator) internal view {
        UpdatableOperatorFiltererUpgradeableStorage storage $ = _getUpdatableOperatorFiltererUpgradeableStorage();
        // Check registry code length to facilitate testing in environments without a deployed registry.
        IOperatorFilterRegistry registry = $.operatorFilterRegistry;
        if (address(registry).code.length > 0) {
            /* solhint-disable no-empty-blocks */
            try registry.isOperatorAllowed(registrant, operator) returns (bool retval) {
                if (retval) {
                    return;
                }
            } catch (bytes memory) {}
            /* solhint-enable  no-empty-blocks */
            revert OperatorNotAllowed(operator);
        }
    }

    /**
     * @notice ERC2771 compatible msg.sender getter
     * @return sender msg.sender
     */
    function _msgSender() internal view virtual returns (address);
}

/**
 * @title IOperatorFilterRegistry
 * @author Opensea
 * @custom:security-contact contact-blockchain@sandbox.game
 * @notice Based on the opensea registry implementation, added here to be used specifically and
 * @notice just once in UpdatableOperatorFiltererUpgradeable
 * @dev see: https://github.com/ProjectOpenSea/operator-filter-registry/tree/main
 */
interface IOperatorFilterRegistry {
    /**
     * @notice Returns true if an address has registered
     * @param addr the address to check if it is registered
     */
    function isRegistered(address addr) external returns (bool);

    /**
     * @notice Returns true if operator is not filtered for a given token, either by address or codeHash. Also returns
     *         true if supplied registrant address is not registered.
     * @param registrant the address of the contract to check for (usually address(this))
     * @param operator the operator to check if it is registered for this registrant
     */
    function isOperatorAllowed(address registrant, address operator) external view returns (bool);


    /**
     * @notice Registers an address with the registry and "subscribes" to another address's filtered operators and codeHashes.
     * @param registrant the address of the contract to check for (usually address(this))
     * @param subscription address to subscribe to
     */
    function registerAndSubscribe(address registrant, address subscription) external;

    /**
     * @notice Registers an address with the registry and copies the filtered operators and codeHashes from another
     *         address without subscribing.
     * @param registrant the address of the contract to check for (usually address(this))
     * @param registrantToCopy address to copy entries from
     */
    function registerAndCopyEntries(address registrant, address registrantToCopy) external;

    /**
     * @notice Registers an address with the registry. May be called by address itself or by EIP-173 owner.
     * @param registrant the address of the contract to check for (usually address(this))
     */
    function register(address registrant) external;
}

