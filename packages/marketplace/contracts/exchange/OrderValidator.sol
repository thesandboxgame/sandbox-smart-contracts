// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {LibOrder} from "../lib-order/LibOrder.sol";
import {LibAsset} from "../lib-asset/LibAsset.sol";
import {SignatureCheckerUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/SignatureCheckerUpgradeable.sol";
import {AddressUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import {EIP712Upgradeable, Initializable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";
import {IOrderValidator} from "../interfaces/IOrderValidator.sol";
import {WhiteList} from "./WhiteList.sol";

/// @title contract for order validation
/// @notice validate orders and contains a white list of tokens
contract OrderValidator is IOrderValidator, Initializable, EIP712Upgradeable, WhiteList {
    using AddressUpgradeable for address;
    using SignatureCheckerUpgradeable for address;

    /// @dev this protects the implementation contract from being initialized.
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice initializer for OrderValidator
    /// @param admin OrderValidator and Whiteist admin
    /// @param newTsbOnly boolean to indicate that only The Sandbox tokens are accepted by the exchange contract
    /// @param newPartners boolena to indicate that partner tokens are accepted by the exchange contract
    /// @param newOpen boolean to indicate that all assets are accepted by the exchange contract
    /// @param newErc20 boolean to activate the white list of ERC20 tokens
    // solhint-disable-next-line func-name-mixedcase
    function __OrderValidator_init_unchained(
        address admin,
        bool newTsbOnly,
        bool newPartners,
        bool newOpen,
        bool newErc20
    ) public initializer {
        __EIP712_init_unchained("Exchange", "1");
        __Whitelist_init(admin, newTsbOnly, newPartners, newOpen, newErc20);
    }

    /// @notice verifies order
    /// @param order order to be validated
    /// @param signature signature of order
    /// @param sender order sender
    function validate(LibOrder.Order calldata order, bytes memory signature, address sender) public view {
        require(order.maker != address(0), "no maker");

        LibOrder.validateOrderTime(order);
        address makeToken = abi.decode(order.makeAsset.assetType.data, (address));
        if (order.makeAsset.assetType.assetClass == LibAsset.AssetClassType.ERC20_ASSET_CLASS) {
            _verifyERC20Whitelist(makeToken);
        } else _verifyWhiteList(makeToken);

        if (order.salt == 0) {
            require(sender == order.maker, "maker is not tx sender");
            // No partial fill the order is reusable forever
            return;
        }

        if (sender == order.maker) {
            return;
        }

        bytes32 hash = LibOrder.hash(order);

        require(
            order.maker.isValidSignatureNow(_hashTypedDataV4(hash), signature),
            "order signature verification error"
        );
    }

    /// @notice if ERC20 token is accepted
    /// @param tokenAddress ERC20 token address
    function _verifyERC20Whitelist(address tokenAddress) internal view {
        if (erc20List && !hasRole(ERC20_ROLE, tokenAddress)) {
            revert("payment token not allowed");
        }
    }

    /// @notice if token is whitelisted
    /// @param tokenAddress ERC20 token address
    function _verifyWhiteList(address tokenAddress) internal view {
        if (open) {
            return;
        } else if ((tsbOnly && hasRole(TSB_ROLE, tokenAddress)) || (partners && hasRole(PARTNER_ROLE, tokenAddress))) {
            return;
        } else {
            revert("not allowed");
        }
    }

    uint256[50] private __gap;
}
