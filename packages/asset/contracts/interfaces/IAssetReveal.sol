//SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

interface IAssetReveal {
    event AssetRevealBurn(
        address revealer,
        uint256 unrevealedTokenId,
        uint32 signatureNonce,
        address assetCreator,
        uint8 tier,
        uint256 amount
    );

    event AssetsRevealed(
        address recipient,
        uint256 unrevealedTokenId,
        uint32 signatureNonce,
        uint256[] amounts,
        uint256[] newTokenIds
    );

    event AssetInstantlyRevealed(
        address recipient,
        uint256 unrevealedTokenId,
        uint256[] amounts,
        uint256[] newTokenIds
    );
}
