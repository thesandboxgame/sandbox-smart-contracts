//SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {IErrors} from "../interfaces/IErrors.sol";
import {WithAdmin} from "./WithAdmin.sol";

/// @title WithSuperOperators
/// @author The Sandbox
/// @notice Add super operators handled by an admin
abstract contract WithSuperOperators is IErrors, WithAdmin {
    /// @param superOperator address that will be given/removed superOperator right.
    /// @param enabled set whether the superOperator is enabled or disabled.
    event SuperOperator(address indexed superOperator, bool indexed enabled);

    /// @notice Enable or disable the ability of `superOperator` to transfer tokens of all (superOperator rights).
    /// @param superOperator address that will be given/removed superOperator right.
    /// @param enabled set whether the superOperator is enabled or disabled.
    function setSuperOperator(address superOperator, bool enabled) external onlyAdmin {
        _setSuperOperator(superOperator, enabled);
    }

    /// @notice check if an address is a super-operator
    /// @param superOperator the operator address to check
    /// @return true if an address is a super-operator
    function isSuperOperator(address superOperator) external view returns (bool) {
        return _isSuperOperator(superOperator);
    }

    /// @notice Enable or disable the ability of `superOperator` to transfer tokens of all (superOperator rights).
    /// @param superOperator address that will be given/removed superOperator right.
    /// @param enabled set whether the superOperator is enabled or disabled.
    function _setSuperOperator(address superOperator, bool enabled) internal {
        if (superOperator == address(0)) {
            revert InvalidAddress();
        }
        if (enabled == _isSuperOperator(superOperator)) {
            revert InvalidArgument();
        }
        _writeSuperOperator(superOperator, enabled);
        emit SuperOperator(superOperator, enabled);
    }

    /// @notice check if an address is a super-operator
    /// @param superOperator the operator address to check
    /// @return true if an address is a super-operator
    /// @dev Implement
    function _isSuperOperator(address superOperator) internal view virtual returns (bool);

    /// @notice enable an address to be super-operator
    /// @param superOperator the address to set
    /// @param enabled true enable the address, false disable it.
    /// @dev Implement
    function _writeSuperOperator(address superOperator, bool enabled) internal virtual;
}
