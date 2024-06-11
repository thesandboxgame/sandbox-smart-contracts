// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {OFTAdapter} from "./oft/OFTAdapter.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title OFTAdapterForSand
/// @dev contract to be used with non-upgradable SAND contract
contract OFTAdapterForSand is OFTAdapter {
    /// @param sandToken SAND token address on the same network as the OFT Adapter
    /// @param layerZeroEndpoint local endpoint address
    /// @param owner owner used as a delegate in LayerZero Endpoint
    constructor(
        address sandToken,
        address layerZeroEndpoint,
        address owner
    ) OFTAdapter(sandToken, layerZeroEndpoint, owner) Ownable(owner) {}
}
