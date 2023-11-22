//SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import {Asset} from "./Asset.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

/// @title AssetV2
/// @author The Sandbox
/// @notice ERC1155 asset token contract
/// @notice Minting and burning tokens is only allowed through separate authorized contracts
/// @dev This contract is final and should not be inherited
contract AssetV2 is Asset, OwnableUpgradeable {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initialize the new Ownable extension
    function reinitialize() external reinitializer(2) {
        __Ownable_init();
    }

    function _msgSender() internal view virtual override(Asset, ContextUpgradeable) returns (address sender) {
        return Asset._msgSender();
    }

    function _msgData() internal view virtual override(Asset, ContextUpgradeable) returns (bytes calldata msgData) {
        return Asset._msgData();
    }
}
