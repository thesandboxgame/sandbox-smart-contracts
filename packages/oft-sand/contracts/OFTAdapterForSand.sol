// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {OFTAdapter} from "./oft/OFTAdapter.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {ERC2771Handler} from "./sand/ERC2771Handler.sol";

/// @title OFTAdapterForSand
/// @dev contract to be used with non-upgradable SAND contract
contract OFTAdapterForSand is OFTAdapter, ERC2771Handler {
    /// @param sandToken SAND token address on the same network as the OFT Adapter
    /// @param layerZeroEndpoint local endpoint address
    /// @param owner owner used as a delegate in LayerZero Endpoint
    /// @param trustedForwarder trusted forwarder address
    constructor(
        address sandToken,
        address layerZeroEndpoint,
        address owner,
        address trustedForwarder
    ) OFTAdapter(sandToken, layerZeroEndpoint, owner) Ownable(owner) {
        __ERC2771Handler_initialize(trustedForwarder);
    }

    /// @notice Change the address of the trusted forwarder for meta-TX.
    /// @param trustedForwarder The new trustedForwarder.
    function setTrustedForwarder(address trustedForwarder) external onlyOwner {
        _trustedForwarder = trustedForwarder;
    }

    function _msgSender() internal view override(ERC2771Handler, Context) returns (address sender) {
        return ERC2771Handler._msgSender();
    }

    function _msgData() internal view override(ERC2771Handler, Context) returns (bytes calldata) {
        return ERC2771Handler._msgData();
    }
}
