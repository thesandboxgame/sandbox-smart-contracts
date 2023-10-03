// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {IWhiteList} from "../interfaces/IWhiteList.sol";

/// @title WhiteList contract
/// @dev controls which tokens are accepted in the marketplace
contract WhiteList is IWhiteList, AccessControlUpgradeable {
    /// @notice role for The Sandbox tokens
    /// @return hash for TSB_ROLE
    bytes32 public constant TSB_ROLE = keccak256("TSB_ROLE");
    /// @notice role for partner tokens
    /// @return hash for PARTNER_ROLE
    bytes32 public constant PARTNER_ROLE = keccak256("PARTNER_ROLE");
    /// @notice role for ERC20 tokens
    /// @return hash for ERC20_ROLE
    bytes32 public constant ERC20_ROLE = keccak256("ERC20_ROLE");

    /// @notice if status == tsbOnly, then only tsbListedContracts [small mapping]
    /// @return tsbOnly
    bool public tsbOnly;

    /// @notice if status == partners, then tsbListedContracts and partnerContracts [manageable mapping]
    /// @return partners
    bool public partners;

    /// @notice if status == open, then no whitelist [no mapping needed]. But then we need a removeListing function for contracts we subsequently
    /// @return open
    bool public open;

    /// @notice if status == erc20List, users can only pay white whitelisted ERC20 tokens
    /// @return erc20List
    bool public erc20List;

    /// @notice event emitted when new permissions for tokens are added
    /// @param tsbOnly boolean indicating that TSB tokens are accepted
    /// @param partners boolean indicating that partner tokens are accepted
    /// @param open boolean indicating that all tokens are accepted
    /// @param erc20List boolean indicating that there is a restriction for ERC20 tokens
    event PermissionSetted(bool tsbOnly, bool partners, bool open, bool erc20List);

    /// @dev this protects the implementation contract from being initialized.
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice initializer for WhiteList
    /// @param admin whitelist admin
    /// @param newTsbOnly allows orders with The Sandbox token
    /// @param newPartners allows orders with partner token
    /// @param newOpen allows orders with any token
    /// @param newErc20List allows to pay orders with only whitelisted token
    // solhint-disable-next-line func-name-mixedcase
    function __Whitelist_init(
        address admin,
        bool newTsbOnly,
        bool newPartners,
        bool newOpen,
        bool newErc20List
    ) internal initializer {
        __AccessControl_init_unchained();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        tsbOnly = newTsbOnly;
        partners = newPartners;
        open = newOpen;
        erc20List = newErc20List;
    }

    /// @notice setting permissions for tokens
    /// @param newTsbOnly allows orders with The Sandbox token
    /// @param newPartners allows orders with partner token
    /// @param newOpen allows orders with any token
    /// @param newErc20List allows to pay orders with only whitelisted token
    function setPermissions(
        bool newTsbOnly,
        bool newPartners,
        bool newOpen,
        bool newErc20List
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        tsbOnly = newTsbOnly;
        partners = newPartners;
        open = newOpen;
        erc20List = newErc20List;

        emit PermissionSetted(tsbOnly, partners, open, erc20List);
    }

    /// @notice add token to tsb list
    /// @param tokenAddress token address
    function addTSB(address tokenAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(TSB_ROLE, tokenAddress);
    }

    /// @notice remove token from tsb list
    /// @param tokenAddress token address
    function removeTSB(address tokenAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(TSB_ROLE, tokenAddress);
    }

    /// @notice add token to partners list
    /// @param tokenAddress token address
    function addPartner(address tokenAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(PARTNER_ROLE, tokenAddress);
    }

    /// @notice remove token from partner list
    /// @param tokenAddress token address
    function removePartner(address tokenAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(PARTNER_ROLE, tokenAddress);
    }

    /// @notice add token to the ERC20 list
    /// @param tokenAddress token address
    function addERC20(address tokenAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(ERC20_ROLE, tokenAddress);
    }

    /// @notice remove token from ERC20 list
    /// @param tokenAddress token address
    function removeERC20(address tokenAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(ERC20_ROLE, tokenAddress);
    }
}
