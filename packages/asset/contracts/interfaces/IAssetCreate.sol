//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title AssetCreate interface
/// @author The Sandbox
interface IAssetCreate {
    struct LazyMintData {
        address caller;
        uint8 tier;
        uint256 amount;
        uint256 unitPrice;
        address paymentToken;
        string metadataHash;
        uint256 maxSupply;
        address creator;
        uint256 expirationTime;
    }

    struct LazyMintBatchData {
        address caller;
        uint8[] tiers;
        uint256[] amounts;
        uint256[] unitPrices;
        address[] paymentTokens;
        string[] metadataHashes;
        uint256[] maxSupplies;
        address[] creators;
        uint256 expirationTime;
    }

    event TrustedForwarderChanged(address indexed newTrustedForwarderAddress);
    event AssetMinted(
        address indexed creator,
        uint256 tokenId,
        uint16 tier,
        uint256 amount,
        string metadataHash,
        bool revealed
    );
    event SpecialAssetMinted(
        address indexed creator,
        uint256 tokenId,
        uint16 tier,
        uint256 amount,
        string metadataHash,
        bool revealed
    );
    event SpecialAssetBatchMinted(
        address indexed creator,
        uint256[] tokenIds,
        uint8[] tiers,
        uint256[] amounts,
        string[] metadataHashes,
        bool[] revealed
    );
    event AssetBatchMinted(
        address indexed creator,
        uint256[] tokenIds,
        uint8[] tiers,
        uint256[] amounts,
        string[] metadataHashes,
        bool[] revealed
    );
    event AssetLazyMinted(
        address indexed recipient,
        address indexed creator,
        uint256 tokenId,
        uint16 tier,
        uint256 amount,
        string metadataHash
    );
    event AssetBatchLazyMinted(
        address indexed recipient,
        address[] creators,
        uint256[] tokenIds,
        uint8[] tiers,
        uint256[] amounts,
        string[] metadataHashes
    );
    event LazyMintFeeSet(uint256 indexed newLazyMintFee);
    event LazyMintFeeReceiverSet(address indexed newLazyMintFeeReceived);
    event ExchangeContractSet(address indexed exchangeContract);
    event AuthValidatorSet(address indexed authValidator);
}
