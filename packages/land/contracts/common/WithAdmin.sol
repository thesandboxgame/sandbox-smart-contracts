//SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {IErrors} from "../interfaces/IErrors.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";

/// @title WithAdmin
/// @author The Sandbox
/// @notice Add an admin to the contract
abstract contract WithAdmin is IErrors, Context {
    /// @notice Emits when the contract administrator is changed.
    /// @param oldAdmin The address of the previous administrator.
    /// @param newAdmin The address of the new administrator.
    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);

    /// @notice checks if the sender is admin
    modifier onlyAdmin() {
        if (_msgSender() != _getAdmin()) {
            revert OnlyAdmin();
        }
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
        if (oldAdmin == address(0)) {
            revert InvalidAddress();
        }
        if (oldAdmin == newAdmin) {
            revert InvalidArgument();
        }
        _changeAdmin(newAdmin);
    }

    /// @notice Change the admin of the contract
    /// @dev Change the administrator to be `newAdmin`.
    /// @param newAdmin The address of the new administrator.
    function _changeAdmin(address newAdmin) internal {
        if (newAdmin == address(0)) {
            revert InvalidAddress();
        }
        address oldAdmin = _getAdmin();
        emit AdminChanged(oldAdmin, newAdmin);
        _setAdmin(newAdmin);
    }

    /// @notice get the admin address
    /// @return the admin address
    ///@dev Implement
    function _getAdmin() internal view virtual returns (address);

    /// @notice set the admin address
    /// @param admin the admin address
    ///@dev Implement
    function _setAdmin(address admin) internal virtual;
}
