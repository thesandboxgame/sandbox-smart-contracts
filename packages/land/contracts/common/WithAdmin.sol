//SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {Context} from "@openzeppelin/contracts/utils/Context.sol";

/// @title WithAdmin
/// @author The Sandbox
/// @notice Add an admin to the contract
abstract contract WithAdmin is Context {
    /// @dev Emits when the contract administrator is changed.
    /// @param oldAdmin The address of the previous administrator.
    /// @param newAdmin The address of the new administrator.
    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);

    modifier onlyAdmin() {
        require(_msgSender() == _getAdmin(), "only admin allowed");
        _;
    }

    /// @notice Get the current admin
    /// @dev Get the current administrator of this contract.
    /// @return The current administrator of this contract.
    function getAdmin() external view returns (address) {
        return _getAdmin();
    }

    /// @notice Change the admin of the contract
    /// @dev Change the administrator to be `newAdmin`.
    /// @param newAdmin The address of the new administrator.
    function changeAdmin(address newAdmin) external onlyAdmin {
        address oldAdmin = _getAdmin();
        require(oldAdmin != address(0), "invalid not set yet");
        require(oldAdmin != newAdmin, "only new admin");
        _changeAdmin(newAdmin);
    }

    function _changeAdmin(address newAdmin) internal {
        require(newAdmin != address(0), "invalid admin");
        address oldAdmin = _getAdmin();
        emit AdminChanged(oldAdmin, newAdmin);
        _setAdmin(newAdmin);
    }

    ///@dev Implement
    function _getAdmin() internal view virtual returns (address);

    ///@dev Implement
    function _setAdmin(address) internal virtual;
}
