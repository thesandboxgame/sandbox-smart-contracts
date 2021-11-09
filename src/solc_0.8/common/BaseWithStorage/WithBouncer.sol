//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import "./AccessControl.sol";

contract WithBouncer is AccessControl {
    bytes32 public constant BOUNCER_ROLE = 0xe4115595bf7ae7cb05bc1951822961d8747bf58987ea2e3c7e4c3ff109c676a5;
    bytes32 public constant BOUNCER_ADMIN_ROLE = 0x0f38c9a95b3e46f81ca9bc843f8e4f96937802cabd5509bc53c899dec1fa769b;

    address internal _bouncerAdmin;

    /// @dev Emits when the contract bouncer is enabled or disbled
    /// @param bouncer address that will be given/removed minting bouncer rights.
    /// @param enabled set whether the address is enabled or disabled as a minting bouncer.
    event Bouncer(address bouncer, bool enabled);

    /// @dev Emits when the contract bouncer admin is changed.
    /// @param oldBouncerAdmin The address of the previous bouncer admin.
    /// @param newBouncerAdmin The address of the new bouncer admin.
    event BouncerAdminChanged(address oldBouncerAdmin, address newBouncerAdmin);

    modifier onlyBouncerAdmin() {
        require(hasRole(BOUNCER_ADMIN_ROLE, msg.sender), "!BOUNCER_ADMIN");
        _;
    }

    modifier onlyBouncer() {
        require(hasRole(BOUNCER_ROLE, msg.sender), "!BOUNCER");
        _;
    }

    /// @dev Change the bouncer admin to be `newBouncerAdmin`.
    /// @param newBouncerAdmin The address of the new administrator.
    function changeBouncerAdmin(address newBouncerAdmin) external {
        require(
            hasRole(getRoleAdmin(BOUNCER_ADMIN_ROLE), msg.sender),
            "AccessControl: sender must be an admin to revoke"
        );

        _bouncerAdmin = newBouncerAdmin;
        _grantRole(BOUNCER_ADMIN_ROLE, newBouncerAdmin);
        _revokeRole(BOUNCER_ADMIN_ROLE, msg.sender);
        emit BouncerAdminChanged(msg.sender, newBouncerAdmin);
    }

    /// @notice Enable or disable the ability of `bouncer` to mint tokens (minting bouncer rights).
    /// @param bouncer address that will be given/removed minting bouncer rights.
    /// @param enabled set whether the address is enabled or disabled as a minting bouncer.
    function setBouncer(address bouncer, bool enabled) external {
        require(
            hasRole(getRoleAdmin(BOUNCER_ROLE), msg.sender),
            "AccessControl: sender must be an admin to grant/revoke"
        );

        enabled ? _grantRole(BOUNCER_ROLE, bouncer) : _revokeRole(BOUNCER_ROLE, bouncer);
        emit Bouncer(bouncer, enabled);
    }
}
