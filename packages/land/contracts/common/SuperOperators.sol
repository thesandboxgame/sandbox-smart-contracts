// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {WithAdmin} from "../common/WithAdmin.sol";

/// @title SuperOperatorsV2
/// @author The Sandbox
/// @notice Implements a super operator role on the contract
/// @dev The contract inheriting SuperOperatorsV2 is able to use a super operator role
abstract contract SuperOperators is WithAdmin {
    event SuperOperator(address indexed superOperator, bool enabled);

    /// @notice Enable or disable the ability of `superOperator` to transfer tokens of all (superOperator rights).
    /// @param superOperator address that will be given/removed superOperator right.
    /// @param enabled set whether the superOperator is enabled or disabled.
    function setSuperOperator(address superOperator, bool enabled) external onlyAdmin {
        mapping(address => bool) storage _superOperators = $superOperators();
        require(superOperator != address(0), "address 0 is not allowed");
        require(enabled != _superOperators[superOperator], "the status should be different");
        _superOperators[superOperator] = enabled;
        emit SuperOperator(superOperator, enabled);
    }

    /// @notice check whether address `who` is given superOperator rights.
    /// @param who The address to query.
    /// @return whether the address has superOperator rights.
    function isSuperOperator(address who) external view returns (bool) {
        return _isSuperOperator(who);
    }

    function _isSuperOperator(address who) internal view returns (bool) {
        mapping(address => bool) storage _superOperators = $superOperators();
        return _superOperators[who];
    }

    function $superOperators() internal view virtual returns (mapping(address => bool) storage);
}
