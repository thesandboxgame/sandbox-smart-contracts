//SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import {Catalyst} from "./Catalyst.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

/// @title CatalystV2
/// @author The Sandbox
/// @notice This contract manages catalysts which are used to mint new assets.
/// @dev An ERC1155 contract that manages catalysts, extends multiple OpenZeppelin contracts to
/// provide a variety of features including, AccessControl, URIStorage, Burnable and more.
/// The contract includes support for meta transactions.
contract CatalystV2 is Catalyst, OwnableUpgradeable {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initialize the new Ownable extension
    function reinitialize() external reinitializer(2) {
        __Ownable_init();
    }

    function _msgSender() internal view virtual override(Catalyst, ContextUpgradeable) returns (address sender) {
        return Catalyst._msgSender();
    }

    function _msgData() internal view virtual override(Catalyst, ContextUpgradeable) returns (bytes calldata msgData) {
        return Catalyst._msgData();
    }
}
