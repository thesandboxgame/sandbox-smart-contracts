//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.23;

import {WithAdmin} from "./WithAdmin.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";

/// @title WithSuperOperators
/// @author The Sandbox
/// @notice Add super operators handled by an admin
contract WithSuperOperators is ContextUpgradeable, WithAdmin {
    mapping(address => bool) internal _superOperators;

    event SuperOperator(address indexed superOperator, bool indexed enabled);

    /// @notice Enable or disable the ability of `superOperator` to transfer tokens of all (superOperator rights).
    /// @param superOperator address that will be given/removed superOperator right.
    /// @param enabled set whether the superOperator is enabled or disabled.
    function setSuperOperator(address superOperator, bool enabled) external onlyAdmin {
        require(_msgSender() == _admin, "only admin");
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
