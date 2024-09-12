// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import {LibOrder} from "./libraries/LibOrder.sol";
import {LibAsset} from "./libraries/LibAsset.sol";
import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import {EIP712Upgradeable, Initializable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import {IOrderValidator} from "./interfaces/IOrderValidator.sol";
import {Whitelist} from "./Whitelist.sol";

/// @author The Sandbox
/// @title OrderValidator
/// @notice Contract for order validation. It validates orders and contains a whitelist of tokens.
contract OrderValidator is IOrderValidator, Initializable, EIP712Upgradeable, ERC165Upgradeable, Whitelist {
    using SignatureChecker for address;

    /// @dev Internal mechanism to protect the implementation contract from being initialized.
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes the OrderValidator contract.
    /// @param admin The admin address for the OrderValidator and Whitelist.
    /// @param roles Array of role identifiers for the Whitelist contract.
    /// @param permissions Array of permissions associated with each role.
    /// @param whitelistsEnabled Boolean to indicate if whitelist functionality is enabled.
    function initialize(
        address admin,
        bytes32[] calldata roles,
        bool[] calldata permissions,
        bool whitelistsEnabled
    ) external initializer {
        __EIP712_init_unchained("The Sandbox Marketplace", "1.0.0");
        __Whitelist_init(admin, roles, permissions, whitelistsEnabled);
    }

    /// @notice Validates the given order.
    /// @param order The order details to be validated.
    /// @param signature The signature associated with the order.
    /// @param sender Address of the order sender.
    function validate(LibOrder.Order calldata order, bytes memory signature, address sender) external view {
        require(order.maker != address(0), "no maker");

        LibOrder.validateOrderTime(order);
        _verifyWhitelists(order.makeAsset);

        if (order.salt == 0) {
            require(sender == order.maker, "maker is not tx sender");
            // No partial fill, the order is reusable forever
            return;
        }

        if (sender == order.maker) {
            return;
        }

        bytes32 hash = LibOrder.hash(order);

        require(order.maker.isValidSignatureNow(_hashTypedDataV4(hash), signature), "signature verification error");
    }

    /// @notice Check if the contract supports an interface
    /// @param interfaceId The id of the interface
    /// @return true if the interface is supported
    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        virtual
        override(AccessControlEnumerableUpgradeable, ERC165Upgradeable, IOrderValidator)
        returns (bool)
    {
        return interfaceId == type(IOrderValidator).interfaceId || super.supportsInterface(interfaceId);
    }

    /// @notice Verifies if the asset exchange is affected by the whitelist.
    /// @param asset Details of the asset to be verified.
    function _verifyWhitelists(LibAsset.Asset calldata asset) internal view {
        address makeToken;
        if (asset.assetType.assetClass == LibAsset.AssetClass.BUNDLE) {
            LibAsset.Bundle memory bundle = LibAsset.decodeBundle(asset.assetType);
            for (uint256 i; i < bundle.bundledERC721.length; i++) {
                makeToken = bundle.bundledERC721[i].erc721Address;
                _verifyWhitelistsRoles(makeToken);
            }
            for (uint256 i; i < bundle.bundledERC1155.length; i++) {
                makeToken = bundle.bundledERC1155[i].erc1155Address;
                _verifyWhitelistsRoles(makeToken);
            }
        } else {
            makeToken = LibAsset.decodeAddress(asset.assetType);
            if (asset.assetType.assetClass == LibAsset.AssetClass.ERC20) {
                if (!hasRole(ERC20_ROLE, makeToken)) {
                    revert("payment token not allowed");
                }
            } else {
                _verifyWhitelistsRoles(makeToken);
            }
        }
    }

    /// @notice Verifies that the given token has the required roles
    /// @param makeToken The token address to check.
    /// @dev Check the status of the whitelists functionality.
    /// @dev If whitelists functionality is activated only tokens(ERC721, ERC1155) that have TSB_ROLE or PARTNER_ROLE are accepted
    function _verifyWhitelistsRoles(address makeToken) private view {
        if (!isWhitelistsEnabled()) {
            return;
        } else if (
            (isRoleEnabled(TSB_ROLE) && hasRole(TSB_ROLE, makeToken)) ||
            (isRoleEnabled(PARTNER_ROLE) && hasRole(PARTNER_ROLE, makeToken))
        ) {
            return;
        } else {
            revert("not allowed");
        }
    }

    // slither-disable-next-line unused-state
    uint256[50] private __gap;
}
