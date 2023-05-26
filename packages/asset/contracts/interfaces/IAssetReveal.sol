//SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

interface IAssetReveal {
    event AssetRevealBurn(
        address revealer,
        uint256 tokenId,
        address assetCreator,
        uint8 tier,
        uint16 assetNonce,
        uint256 amount
    );

    event AssetsRevealed(
        address recipient,
        address creator,
        uint256 oldTokenId,
        uint256[] newTokenIds
    );
}
