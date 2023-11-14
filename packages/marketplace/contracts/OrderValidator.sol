// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {LibOrder} from "./libraries/LibOrder.sol";
import {LibAsset} from "./libraries/LibAsset.sol";
import {SignatureCheckerUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/SignatureCheckerUpgradeable.sol";
import {EIP712Upgradeable, Initializable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";
import {IOrderValidator} from "./interfaces/IOrderValidator.sol";
import {Whitelist} from "./Whitelist.sol";

/// @author The Sandbox
/// @title OrderValidator
/// @notice Contract for order validation. It validates orders and contains a whitelist of tokens.
contract OrderValidator is IOrderValidator, Initializable, EIP712Upgradeable, Whitelist {
    using SignatureCheckerUpgradeable for address;

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
    // solhint-disable-next-line func-name-mixedcase
    function __OrderValidator_init_unchained(
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

    /// @notice Verifies if the asset exchange is affected by the whitelist.
    /// @param asset Details of the asset to be verified.
    /// @dev If the asset type is ERC20, the ERC20_ROLE is checked.
    /// @dev if ERC20_ROLE is enabled only tokens that have the role are accepted
    /// @dev If whitelists are enabled, checks TSB_ROLE and PARTNER_ROLE.
    function _verifyWhitelists(LibAsset.Asset calldata asset) internal view {
        address makeToken = LibAsset.decodeAddress(asset.assetType);
        if (asset.assetType.assetClass == LibAsset.AssetClass.ERC20) {
            if (!hasRole(ERC20_ROLE, makeToken)) {
                revert("payment token not allowed");
            }
        } else {
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
    }

    // slither-disable-next-line unused-state
    uint256[50] private __gap;
}
