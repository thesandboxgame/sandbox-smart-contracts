//SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {WithAdmin} from "../common/WithAdmin.sol";

/// @title WithSuperOperators
/// @author The Sandbox
/// @notice Add super operators handled by an admin
abstract contract WithSuperOperators is WithAdmin {
    /// @param superOperator address that will be given/removed superOperator right.
    /// @param enabled set whether the superOperator is enabled or disabled.
    event SuperOperator(address indexed superOperator, bool indexed enabled);

    /// @notice Enable or disable the ability of `superOperator` to transfer tokens of all (superOperator rights).
    /// @param superOperator address that will be given/removed superOperator right.
    /// @param enabled set whether the superOperator is enabled or disabled.
    function setSuperOperator(address superOperator, bool enabled) external onlyAdmin {
        require(superOperator != address(0), "address 0 is not allowed");
        require(enabled != _isSuperOperator(superOperator), "invalid status");
        _setSuperOperator(superOperator, enabled);
        emit SuperOperator(superOperator, enabled);
    }

    /// @notice check whether address `who` is given superOperator rights.
    /// @param who The address to query.
    /// @return whether the address has superOperator rights.
    function isSuperOperator(address who) external view returns (bool) {
        return _isSuperOperator(who);
    }

    function _isSuperOperator(address who) internal view virtual returns (bool);

    function _setSuperOperator(address superOperator, bool enabled) internal virtual;
}
