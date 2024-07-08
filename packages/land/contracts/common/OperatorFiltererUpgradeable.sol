//SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import {IOperatorFilterRegistry} from "../interfaces/IOperatorFilterRegistry.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";

/// @title OperatorFiltererUpgradeable
/// @author The Sandbox
/// @custom:security-contact contact-blockchain@sandbox.game
/// @notice This contract would subscribe or copy or just to the subscription provided or just register to default subscription list
/// @dev This contract is the upgradeable version of the OpenSea implementation https://github.com/ProjectOpenSea/operator-filter-registry/blob/main/src/OperatorFilterer.sol and adapted to the 0.5.9 solidity version
abstract contract OperatorFiltererUpgradeable is Context {
    /// @notice emitted when a registry is set
    /// @param registry address of the registry to set
    event OperatorRegistrySet(IOperatorFilterRegistry indexed registry);

    /// @notice emitted when the contract is registered into the registry
    /// @param subscriptionOrRegistrant address to subscribe or copy entries from
    /// @param subscribe should it subscribe
    event ContractRegistered(address indexed subscriptionOrRegistrant, bool subscribe);

    /// @notice the caller is not the operator
    error OperatorNotAllowed();

    /// @notice Used in approval operations to check if the operator is allowed to call this contract
    /// @param operator The address receiving the approval
    modifier onlyAllowedOperatorApproval(address operator) virtual {
        _checkIsOperatorAllowed(address(this), operator);
        _;
    }

    /// @notice Used in transfer from operations to check if the sender of the token is allowed to call this contract
    /// @param from the sender of the token
    modifier onlyAllowedOperator(address from) virtual {
        IOperatorFilterRegistry registry = _readOperatorFilterRegistry();
        // Check registry code length to facilitate testing in environments without a deployed registry.
        // Allow spending tokens from addresses with balance
        // Note that this still allows listings and marketplaces with escrow to transfer tokens if transferred
        // from an EOA.
        if (from != _msgSender()) {
            _checkIsOperatorAllowed(address(this), _msgSender());
        }
        _;
    }

    /// @notice return the address of the operator filter registry
    /// @return the address of  the operator filter registry
    function operatorFilterRegistry() external view returns (IOperatorFilterRegistry) {
        return _readOperatorFilterRegistry();
    }

    /// @notice Register this contract into the registry
    /// @param subscriptionOrRegistrantToCopy address to subscribe or copy entries from
    /// @param subscribe should it subscribe
    function _register(address subscriptionOrRegistrantToCopy, bool subscribe) internal {
        IOperatorFilterRegistry registry = _readOperatorFilterRegistry();
        if (address(registry).code.length > 0) {
            if (!registry.isRegistered(address(this))) {
                if (subscribe) {
                    registry.registerAndSubscribe(address(this), subscriptionOrRegistrantToCopy);
                } else {
                    if (subscriptionOrRegistrantToCopy != address(0)) {
                        registry.registerAndCopyEntries(address(this), subscriptionOrRegistrantToCopy);
                    } else {
                        registry.register(address(this));
                    }
                }
            }
        }
        emit ContractRegistered(subscriptionOrRegistrantToCopy, subscribe);
    }

    /// @notice sets filter registry address deployed in test
    /// @param registry the address of the registry
    function _setOperatorRegistry(IOperatorFilterRegistry registry) internal {
        _writeOperatorFilterRegistry(registry);
        emit OperatorRegistrySet(registry);
    }

    /// @notice Check if the operator is allowed for the given registrant
    /// @param registrant address of the registrant
    /// @param operator operator address to check
    function _checkIsOperatorAllowed(address registrant, address operator) internal view {
        IOperatorFilterRegistry registry = _readOperatorFilterRegistry();
        // Check registry code length to facilitate testing in environments without a deployed registry.
        if (address(registry).code.length > 0) {
            /* solhint-disable no-empty-blocks */
            try registry.isOperatorAllowed(registrant, operator) returns (bool retval) {
                if (retval) {
                    return;
                }
            } catch (bytes memory) {}
            /* solhint-enable  no-empty-blocks */
            revert OperatorNotAllowed();
        }
    }

    /// @notice get the OpenSea operator filter
    /// @return the address of the OpenSea operator filter registry
    function _readOperatorFilterRegistry() internal view virtual returns (IOperatorFilterRegistry);

    /// @notice set the OpenSea operator filter
    /// @param registry the address of the OpenSea operator filter registry
    function _writeOperatorFilterRegistry(IOperatorFilterRegistry registry) internal virtual;
}
