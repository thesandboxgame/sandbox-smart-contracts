// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {LibOrder} from "../lib-order/LibOrder.sol";
import {IERC1271Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC1271Upgradeable.sol";
import {ECDSAUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import {AddressUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import {EIP712Upgradeable, Initializable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";
import {IOrderValidator} from "../interfaces/IOrderValidator.sol";
import {WhiteList} from "./WhiteList.sol";

/// @title contract for order validation
/// @notice validate orders and contains a white list of tokens
contract OrderValidator is IOrderValidator, Initializable, EIP712Upgradeable, WhiteList {
    using ECDSAUpgradeable for bytes32;
    using AddressUpgradeable for address;

    bytes4 internal constant MAGICVALUE = 0x1626ba7e;

    /// @dev this protects the implementation contract from being initialized.
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice initializer for OrderValidator
    /// @param newTsbOnly boolean to indicate that only The Sandbox tokens are accepted by the exchange contract
    /// @param newPartners boolena to indicate that partner tokens are accepted by the exchange contract
    /// @param newOpen boolean to indicate that all assets are accepted by the exchange contract
    /// @param newErc20 boolean to activate the white list of ERC20 tokens
    // solhint-disable-next-line func-name-mixedcase
    function __OrderValidator_init_unchained(
        bool newTsbOnly,
        bool newPartners,
        bool newOpen,
        bool newErc20
    ) public initializer {
        __EIP712_init_unchained("Exchange", "1");
        __Whitelist_init(newTsbOnly, newPartners, newOpen, newErc20);
    }

    /// @notice verifies order
    /// @param order order to be validated
    /// @param signature signature of order
    /// @param sender order sender
    function validate(LibOrder.Order memory order, bytes memory signature, address sender) public view {
        LibOrder.validateOrderTime(order);

        address makeToken = abi.decode(order.makeAsset.assetType.data, (address));
        verifyWhiteList(makeToken);

        if (order.salt == 0) {
            if (order.maker != address(0)) {
                require(sender == order.maker, "maker is not tx sender");
            }
        } else {
            if (sender != order.maker) {
                bytes32 hash = LibOrder.hash(order);
                // if maker is contract checking ERC1271 signature
                if (order.maker.isContract()) {
                    require(
                        IERC1271Upgradeable(order.maker).isValidSignature(_hashTypedDataV4(hash), signature) ==
                            MAGICVALUE,
                        "contract order signature verification error"
                    );
                } else {
                    // if maker is not contract then checking ECDSA signature
                    if (_hashTypedDataV4(hash).recover(signature) != order.maker) {
                        revert("order signature verification error");
                    } else {
                        require(order.maker != address(0), "no maker");
                    }
                }
            }
        }
    }

    /// @notice if ERC20 token is accepted
    /// @param tokenAddress ERC20 token address
    function verifyERC20Whitelist(address tokenAddress) external view {
        if (erc20List && !hasRole(ERC20_ROLE, tokenAddress)) {
            revert("payment token not allowed");
        }
    }

    function verifyWhiteList(address tokenAddress) internal view {
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
