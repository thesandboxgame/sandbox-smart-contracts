// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import {Admin} from "./Admin.sol";
import {AddressUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";

/// @title MetaTransactionReceiver
/// @author The Sandbox
/// @notice Implements meta-transactions
/// @dev This contract permits to give an address the capacity to perform meta-transactions on behalf of any address
contract MetaTransactionReceiver is Admin {
    using AddressUpgradeable for address;

    mapping(address => bool) internal _metaTransactionContracts;
    event MetaTransactionProcessor(address indexed metaTransactionProcessor, bool enabled);

    /// @notice Enable or disable the ability of `metaTransactionProcessor` to perform meta-tx (metaTransactionProcessor rights).
    /// @param metaTransactionProcessor address that will be given/removed metaTransactionProcessor rights.
    /// @param enabled set whether the metaTransactionProcessor is enabled or disabled.
    function setMetaTransactionProcessor(address metaTransactionProcessor, bool enabled) public onlyAdmin {
        require(metaTransactionProcessor.isContract(), "invalid address");
        _setMetaTransactionProcessor(metaTransactionProcessor, enabled);
    }

    /// @param metaTransactionProcessor address of the operator
    /// @param enabled is it enabled
    function _setMetaTransactionProcessor(address metaTransactionProcessor, bool enabled) internal {
        _metaTransactionContracts[metaTransactionProcessor] = enabled;
        emit MetaTransactionProcessor(metaTransactionProcessor, enabled);
    }

    /// @notice check whether address `who` is given meta-transaction execution rights.
    /// @param who The address to query.
    /// @return whether the address has meta-transaction execution rights.
    function isMetaTransactionProcessor(address who) external view returns (bool) {
        return _metaTransactionContracts[who];
    }
}
