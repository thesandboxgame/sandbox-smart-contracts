// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import {Admin} from "./Admin.sol";

/// @title SuperOperators
/// @author The Sandbox
/// @notice Implements a super operator role on the contract
/// @dev The contract inheriting SuperOperators is able to use a super operator role
contract SuperOperators is Admin {
    mapping(address => bool) internal _superOperators;

    event SuperOperator(address indexed superOperator, bool enabled);

    /// @notice Enable or disable the ability of `superOperator` to transfer tokens of all (superOperator rights).
    /// @param superOperator address that will be given/removed superOperator right.
    /// @param enabled set whether the superOperator is enabled or disabled.
    function setSuperOperator(address superOperator, bool enabled) external onlyAdmin {
        require(superOperator != address(0), "address 0 is not allowed");
        require(enabled != _superOperators[superOperator], "invalid status");
        _superOperators[superOperator] = enabled;
        emit SuperOperator(superOperator, enabled);
    }

    /// @notice check whether address `who` is given superOperator rights.
    /// @param who The address to query.
    /// @return whether the address has superOperator rights.
    function isSuperOperator(address who) public view returns (bool) {
        return _superOperators[who];
    }
}
