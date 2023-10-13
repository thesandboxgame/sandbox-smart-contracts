// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {LibOrder} from "./libraries/LibOrder.sol";
import {LibAsset} from "./libraries/LibAsset.sol";
import {SignatureCheckerUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/SignatureCheckerUpgradeable.sol";
import {EIP712Upgradeable, Initializable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";
import {IOrderValidator} from "./interfaces/IOrderValidator.sol";
import {Whitelist} from "./Whitelist.sol";

/// @title contract for order validation
/// @notice validate orders and contains a white list of tokens
contract OrderValidator is IOrderValidator, Initializable, EIP712Upgradeable, Whitelist {
    using SignatureCheckerUpgradeable for address;

    /// @dev this protects the implementation contract from being initialized.
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /* /// @notice initializer for OrderValidator
    /// @param admin OrderValidator and Whiteist admin
    /// @param newTsbOnly boolean to indicate that only The Sandbox tokens are accepted by the exchange contract
    /// @param newPartners boolena to indicate that partner tokens are accepted by the exchange contract
    /// @param newErc20 boolean to activate the white list of ERC20 tokens
    /// @param whitelistsEnabled boolean to indicate that all assets are accepted by the exchange contract */
    // solhint-disable-next-line func-name-mixedcase
    function __OrderValidator_init_unchained(
        address admin,
        bytes32[] calldata roles,
        bool[] calldata permissions,
        bool whitelistsEnabled
    ) public initializer {
        __EIP712_init_unchained("Exchange", "1");
        __Whitelist_init(admin, roles, permissions, whitelistsEnabled);
    }

    /// @notice verifies order
    /// @param order order to be validated
    /// @param signature signature of order
    /// @param sender order sender
    function validate(LibOrder.Order calldata order, bytes memory signature, address sender) public view {
        require(order.maker != address(0), "no maker");

        LibOrder.validateOrderTime(order);
        _verifyWhiteList(order.makeAsset);

        if (order.salt == 0) {
            require(sender == order.maker, "maker is not tx sender");
            // No partial fill the order is reusable forever
            return;
        }

        if (sender == order.maker) {
            return;
        }

        bytes32 hash = LibOrder.hash(order);

        require(order.maker.isValidSignatureNow(_hashTypedDataV4(hash), signature), "signature verification error");
    }

    /// @notice if token is whitelisted
    /// @param asset make asset to be verifyed
    function _verifyWhiteList(LibAsset.Asset calldata asset) internal view {
        address makeToken = abi.decode(asset.assetType.data, (address));
        if (asset.assetType.assetClass == LibAsset.AssetClass.ERC20) {
            if (isRoleEnabled(ERC20_ROLE) && !hasRole(ERC20_ROLE, makeToken)) {
                revert("payment token not allowed");
            }
        } else {
            if (isWhitelistsEnabled()) {
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
