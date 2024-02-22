//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.23;

import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";

/// @title WithAdmin
/// @author The Sandbox
/// @notice Add an admin to the contract
contract WithAdmin is ContextUpgradeable {
    address internal _admin;

    /// @dev Emits when the contract administrator is changed.
    /// @param oldAdmin The address of the previous administrator.
    /// @param newAdmin The address of the new administrator.
    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);

    modifier onlyAdmin() {
        require(_msgSender() == _admin, "ADMIN_ONLY");
        _;
    }

    /// @notice Get the current admin
    /// @dev Get the current administrator of this contract.
    /// @return The current administrator of this contract.
    function getAdmin() external view returns (address) {
        return _admin;
    }

    /// @notice Change the admin of the contract
    /// @dev Change the administrator to be `newAdmin`.
    /// @param newAdmin The address of the new administrator.
    function changeAdmin(address newAdmin) external {
        address admin = _admin;
        require(_msgSender() == admin, "ADMIN_ACCESS_DENIED");
        emit AdminChanged(admin, newAdmin);
        _admin = newAdmin;
    }
}
