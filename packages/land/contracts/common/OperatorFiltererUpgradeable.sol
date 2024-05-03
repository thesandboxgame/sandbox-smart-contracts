//SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import {IOperatorFilterRegistry} from "../interfaces/IOperatorFilterRegistry.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";

///@title OperatorFiltererUpgradeable
///@author The Sandbox
///@notice This contract would subscribe or copy or just to the subscription provided or just register to default subscription list
///@dev This contract is the upgradeable version of the OpenSea implementation https://github.com/ProjectOpenSea/operator-filter-registry/blob/main/src/OperatorFilterer.sol and adapted to the 0.5.9 solidity version
abstract contract OperatorFiltererUpgradeable is Context {
    event OperatorRegistrySet(IOperatorFilterRegistry indexed registry);
    event ContractRegistered(address indexed subscriptionOrRegistrant, bool subscribe);
    /// @notice the caller is not the operator
    error OperatorNotAllowed();

    modifier onlyAllowedOperatorApproval(address operator) virtual {
        IOperatorFilterRegistry registry = _readOperatorFilterRegistry();
        // Check registry code length to facilitate testing in environments without a deployed registry.
        if (address(registry).code.length > 0) {
            if (!registry.isOperatorAllowed(address(this), operator)) {
                revert OperatorNotAllowed();
            }
        }
        _;
    }

    modifier onlyAllowedOperator(address from) virtual {
        IOperatorFilterRegistry registry = _readOperatorFilterRegistry();
        // Check registry code length to facilitate testing in environments without a deployed registry.
        if (address(registry).code.length > 0) {
            // Allow spending tokens from addresses with balance
            // Note that this still allows listings and marketplaces with escrow to transfer tokens if transferred
            // from an EOA.
            if (from == _msgSender()) {
                _;
                return;
            }
            if (!registry.isOperatorAllowed(address(this), _msgSender())) {
                revert OperatorNotAllowed();
            }
        }
        _;
    }

    /// @notice sets filter registry address deployed in test
    /// @param registry the address of the registry
    function _setOperatorRegistry(IOperatorFilterRegistry registry) internal {
        _writeOperatorFilterRegistry(registry);
        emit OperatorRegistrySet(registry);
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

    /// @notice get the OpenSea operator filter
    /// @return the address of the OpenSea operator filter registry
    function _readOperatorFilterRegistry() internal view virtual returns (IOperatorFilterRegistry);

    /// @notice set the OpenSea operator filter
    /// @param registry the address of the OpenSea operator filter registry
    function _writeOperatorFilterRegistry(IOperatorFilterRegistry registry) internal virtual;
}
