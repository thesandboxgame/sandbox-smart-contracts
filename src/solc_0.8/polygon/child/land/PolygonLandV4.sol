// SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {ERC2771Handler} from "../../../common/BaseWithStorage/ERC2771Handler.sol";
import {PolygonLandRegistryMixin} from "./PolygonLandRegistryMixin.sol";

/// @title LAND token on L2
contract PolygonLandV4 is ERC2771Handler, PolygonLandRegistryMixin {
    uint256 public constant VERSION = 4;

    function initialize(address trustedForwarder) external initializer {
        _admin = _msgSender();
        __ERC2771Handler_initialize(trustedForwarder);
    }

    /// @dev Change the address of the trusted forwarder for meta-TX
    /// @param trustedForwarder The new trustedForwarder
    function setTrustedForwarder(address trustedForwarder) external onlyAdmin {
        _trustedForwarder = trustedForwarder;
    }

    function _msgSender() internal view override(ContextUpgradeable, ERC2771Handler) returns (address sender) {
        return ERC2771Handler._msgSender();
    }

    function _msgData() internal view override(ContextUpgradeable, ERC2771Handler) returns (bytes calldata) {
        return ERC2771Handler._msgData();
    }
}
