// SPDX-License-Identifier: MIT

pragma solidity 0.8.26;

import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable-5.0.2/token/ERC721/ERC721Upgradeable.sol";

/**
 * @title ERC721BurnMemoryUpgradeable
 * @author The Sandbox
 * @custom:security-contact contact-blockchain@sandbox.game
 * @notice Baseline ERC721 contract to be used by the NFTCollection contract
 * @dev provides the "burn memory" functionality: keeping track of who burned what token
 */
abstract contract ERC721BurnUpgradeable is ERC721Upgradeable {
    struct ERC721BurnMemoryUpgradeableStorage {
        /**
         * @notice flag that gates burning (enabling/disabling burning)
         */
        bool isBurnEnabled;
    }

    /// @custom:storage-location erc7201:thesandbox.storage.avatar.nft-collection.ERC721BurnMemoryUpgradeable
    bytes32 internal constant ERC721_BURN_MEMORY_UPGRADABLE_STORAGE_LOCATION =
    0x6936713dbc593f49219a6774bfcd8c37b5bc8ca843481c9ed2d56b3c48c59400;

    function _getERC721BurnMemoryUpgradableStorage() private pure returns (ERC721BurnMemoryUpgradeableStorage storage $) {
        // solhint-disable-next-line no-inline-assembly
        assembly {
            $.slot := ERC721_BURN_MEMORY_UPGRADABLE_STORAGE_LOCATION
        }
    }

    /**
     * @notice event emitted when a token was burned
     * @param operator the sender of the transaction
     * @param tokenId the id of the token that was burned
     * @param burner the owner that burned the token
     */
    event TokenBurned(address indexed operator, uint256 indexed tokenId, address indexed burner);

    /**
     * @notice event emitted when token burning was enabled
     * @param operator the sender of the transaction
     */
    event TokenBurningEnabled(address indexed operator);

    /**
     * @notice event emitted when token burning was disabled
     * @param operator the sender of the transaction
     */
    event TokenBurningDisabled(address indexed operator);

    /**
     * @notice The operation failed because burning is enabled.
     */
    error EnforcedBurn();

    /**
     * @notice The operation failed because burning is disabled.
     */
    error ExpectedBurn();

    /**
     * @notice enables burning of tokens
     */
    function _enableBurning() internal {
        ERC721BurnMemoryUpgradeableStorage storage $ = _getERC721BurnMemoryUpgradableStorage();
        if ($.isBurnEnabled) {
            revert EnforcedBurn();
        }
        $.isBurnEnabled = true;
        emit TokenBurningEnabled(_msgSender());
    }

    /**
     * @notice disables burning of tokens
     */
    function _disableBurning() internal {
        ERC721BurnMemoryUpgradeableStorage storage $ = _getERC721BurnMemoryUpgradableStorage();
        if (!$.isBurnEnabled) {
            revert ExpectedBurn();
        }
        $.isBurnEnabled = false;
        emit TokenBurningDisabled(_msgSender());
    }

    /**
     * @notice Burns `tokenId`. The caller must own `tokenId` or be an approved operator.
     * @param tokenId the token id to be burned
     */
    function _burnWithCheck(uint256 tokenId) internal virtual {
        ERC721BurnMemoryUpgradeableStorage storage $ = _getERC721BurnMemoryUpgradableStorage();
        if (!$.isBurnEnabled) {
            revert ExpectedBurn();
        }
        address sender = _msgSender();
        // Setting an "auth" arguments enables the `_isAuthorized` check which verifies that the token exists
        // (from != 0). Therefore, it is not needed to verify that the return value is not 0 here.
        address previousOwner = _update(address(0), tokenId, sender);
        emit TokenBurned(sender, tokenId, previousOwner);
    }

    /**
     * @notice Return true if burning is enabled
     */
    function isBurnEnabled() external view returns (bool) {
        ERC721BurnMemoryUpgradeableStorage storage $ = _getERC721BurnMemoryUpgradableStorage();
        return $.isBurnEnabled;
    }

}
