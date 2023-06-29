//SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

interface IAssetReveal {
    event AssetRevealBurn(
        address revealer,
        uint256 unrevealedTokenId,
        uint8 tier,
        uint256 amount
    );

    event AssetRevealMint(
        address recipient,
        uint256 unrevealedTokenId,
        uint256[] amounts,
        uint256[] newTokenIds,
        bytes32[] revealHashes
    );
}
