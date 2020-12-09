//SPDX-License-Identifier: MIT
pragma solidity 0.7.5;

import "./WithAdmin.sol";

contract WithSuperOperators is WithAdmin {
    mapping(address => bool) internal _superOperators;

    /// @dev Emits when superOperator rights are set
    /// @param superOperator The address whose rights are being granted / evoked
    /// @param enabled Whether or not this address has superOperator rights
    event SuperOperator(address superOperator, bool enabled);

    /// @notice Enable or disable the ability of `superOperator` to transfer tokens of all (superOperator rights).
    /// @param superOperator Address that will be given/removed superOperator right.
    /// @param enabled Set whether the superOperator is enabled or disabled.
    function setSuperOperator(address superOperator, bool enabled) external {
        require(msg.sender == _admin, "ADMIN_ACCESS_DENIED");
        _superOperators[superOperator] = enabled;
        emit SuperOperator(superOperator, enabled);
    }

    /// @notice Check whether address `who` is given superOperator rights.
    /// @param who The address to query.
    /// @return Whether the address has superOperator rights.
    function isSuperOperator(address who) public view returns (bool) {
        return _superOperators[who];
    }
}
