//SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

/// @title AssetReveal interface
/// @author The Sandbox
interface IAssetReveal {
    event TrustedForwarderChanged(address indexed newTrustedForwarderAddress);
    event AssetRevealBurn(address indexed revealer, uint256 unrevealedTokenId, uint256 amount);
    event AssetRevealBatchBurn(address indexed revealer, uint256[] unrevealedTokenIds, uint256[] amounts);
    event AssetRevealMint(
        address indexed recipient,
        uint256 unrevealedTokenId,
        uint256[] amounts,
        uint256[] newTokenIds,
        bytes32[] revealHashes
    );
    event AssetRevealBatchMint(
        address indexed recipient,
        uint256[] unrevealedTokenIds,
        uint256[][] amounts,
        uint256[][] newTokenIds,
        bytes32[][] revealHashes
    );
}
