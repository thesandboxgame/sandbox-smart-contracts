// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

/// @author The Sandbox
/// @title LibAsset: A library for handling different types of Ethereum assets.
/// @notice This library contains structs, enums, and utility functions for managing and processing Ethereum assets.
library LibAsset {
    /// @dev Represents different types of assets on the Ethereum network.
    enum AssetClass {
        INVALID, // Represents an invalid asset type.
        ERC20, // Represents an ERC20 token.
        ERC721, // Represents a single ERC721 token.
        ERC1155, // Represents an ERC1155 token.
        BUNDLE // Represents a group of tokens of various types.
    }

    /// @dev Represents the side of the trade from which a fee should be taken, if any.
    enum FeeSide {
        NONE, // No fees are taken.
        LEFT, // Fees are taken from the left side of the trade.
        RIGHT // Fees are taken from the right side of the trade.
    }

    /// @dev Represents the type of a specific asset.
    /// AssetType can represent a specific ERC-721 token (defined by the token contract address and tokenId) or
    /// a specific ERC-20 token (like DAI).
    struct AssetType {
        AssetClass assetClass; // The class of the asset (ERC20, ERC721, etc.).
        bytes data; // Contains the token's contract address and possibly its tokenId.
    }

    /// @dev Represents any asset on the Ethereum blockchain with its type and value.
    struct Asset {
        AssetType assetType; // The type of the asset.
        uint256 value; // The amount or value of the asset.
        BundlePriceDistribution bundlePriceDistribution; // The price distribution for individual assets in bundle.
    }

    /// @dev Represents a group (i.e. bundle) of ERC20 assets on the Ethereum blockchain.
    struct BundledERC20 {
        address erc20Address;
        uint256 value;
    }

    /// @dev Represents a group (i.e. bundle) of ERC721 assets on the Ethereum blockchain.
    struct BundledERC721 {
        address erc721Address;
        uint256[] ids;
    }

    /// @dev Represents a group (i.e. bundle) of ERC1155 assets on the Ethereum blockchain.
    struct BundledERC1155 {
        address erc1155Address;
        uint256[] ids;
        uint256[] supplies;
    }

    /// @dev Represents a group of LAND ERC721 token (enables LAND quad batch transfer functionality).
    struct Quads {
        uint256[] sizes;
        uint256[] xs;
        uint256[] ys;
        bytes data;
    }

    /// @dev Represents a group (i.e. bundle) of assets on the Ethereum blockchain with its types and values.
    struct Bundle {
        BundledERC20[] bundledERC20;
        BundledERC721[] bundledERC721;
        BundledERC1155[] bundledERC1155;
        Quads quads;
    }

    /// @dev Represents the price of each asset in a bundle.
    struct BundlePriceDistribution {
        uint256[] erc20Prices;
        uint256[][] erc721Prices;
        uint256[][] erc1155Prices;
        uint256 quadPrice;
    }

    bytes32 internal constant ASSET_TYPE_TYPEHASH = keccak256("AssetType(uint256 assetClass,bytes data)");

    bytes32 internal constant ASSET_TYPEHASH =
        keccak256("Asset(AssetType assetType,uint256 value)AssetType(uint256 assetClass,bytes data)");

    /// @notice Determine which side of a trade should bear the fee, based on the asset types.
    /// @param leftClass The asset class type of the left side of the trade.
    /// @param rightClass The asset class type of the right side of the trade.
    /// @return FeeSide representing which side should bear the fee, if any.
    function getFeeSide(AssetClass leftClass, AssetClass rightClass) internal pure returns (FeeSide) {
        if (leftClass == AssetClass.ERC20 && rightClass != AssetClass.ERC20) {
            return FeeSide.LEFT;
        }
        if (rightClass == AssetClass.ERC20 && leftClass != AssetClass.ERC20) {
            return FeeSide.RIGHT;
        }
        return FeeSide.NONE;
    }

    /// @notice Check if two asset types match.
    /// @param leftType Asset type on the left side of a trade.
    /// @param rightType Asset type on the right side of a trade.
    /// @return AssetType representing the matched asset type.
    function matchAssets(
        AssetType calldata leftType,
        AssetType calldata rightType
    ) internal pure returns (AssetType memory) {
        AssetClass classLeft = leftType.assetClass;
        AssetClass classRight = rightType.assetClass;

        require(classLeft != AssetClass.INVALID, "invalid left asset class");
        require(classRight != AssetClass.INVALID, "invalid right asset class");
        require(classLeft == classRight, "assets don't match");

        bytes32 leftHash = keccak256(leftType.data);
        bytes32 rightHash = keccak256(rightType.data);
        require(leftHash == rightHash, "assets don't match");

        return leftType;
    }

    /// @notice Compute the hash of an asset type.
    /// @param assetType The asset type to hash.
    /// @return The hash of the asset type.
    function hash(AssetType memory assetType) internal pure returns (bytes32) {
        return keccak256(abi.encode(ASSET_TYPE_TYPEHASH, assetType.assetClass, keccak256(assetType.data)));
    }

    /// @notice Compute the hash of an asset.
    /// @param asset The asset to hash.
    /// @return The hash of the asset.
    function hash(Asset memory asset) internal pure returns (bytes32) {
        return keccak256(abi.encode(ASSET_TYPEHASH, hash(asset.assetType), asset.value));
    }

    /// @notice Decode the token details (address and tokenId) from an AssetType.
    /// @param assetType The asset type to decode.
    /// @return Address of the token
    /// @return Id of the token
    function decodeToken(AssetType memory assetType) internal pure returns (address, uint256) {
        return abi.decode(assetType.data, (address, uint256));
    }

    /// @notice Decode the token address from an AssetType.
    /// @param assetType The asset type to decode.
    /// @return The address of the token.
    function decodeAddress(AssetType memory assetType) internal pure returns (address) {
        return abi.decode(assetType.data, (address));
    }

    /// @notice Decode the token details (address and tokenId) from a group of AssetTypes.
    /// @param assetType The asset type to decode.
    /// @return Bundle information.
    function decodeBundle(AssetType memory assetType) internal pure returns (Bundle memory) {
        return abi.decode(assetType.data, (Bundle));
    }

    /// @dev function to compute the total of individual prices in bundle.
    /// @param bundle The bundle.
    /// @param bundlePriceDistribution The bundle price details.
    /// @return The total price of the bundle.
    function computeBundlePrice(
        Bundle memory bundle,
        BundlePriceDistribution memory bundlePriceDistribution
    ) internal pure returns (uint256) {
        uint256 totalPrice = 0;

        // total price of all bundled ERC20 assets
        for (uint256 i = 0; i < bundlePriceDistribution.erc20Prices.length; i++) {
            totalPrice += bundlePriceDistribution.erc20Prices[i];
        }

        // calculate the total price of all bundled ERC721 assets
        for (uint256 i = 0; i < bundlePriceDistribution.erc721Prices.length; i++) {
            for (uint256 j = 0; j < bundlePriceDistribution.erc721Prices[i].length; j++)
                totalPrice += bundlePriceDistribution.erc721Prices[i][j];
        }

        // calculate the total price of all bundled ERC1155 assets
        for (uint256 i = 0; i < bundlePriceDistribution.erc1155Prices.length; i++) {
            for (uint256 j = 0; j < bundlePriceDistribution.erc1155Prices[i].length; j++) {
                totalPrice += bundle.bundledERC1155[i].supplies[j] * bundlePriceDistribution.erc1155Prices[i][j];
            }
        }

        totalPrice += bundlePriceDistribution.quadPrice;

        return totalPrice;
    }

    /// @notice Decode the recipient address from an AssetType.
    /// @param assetType The asset type to decode.
    /// @return The address of the recipient, or zero address if not present.
    function decodeRecipient(AssetType memory assetType) internal pure returns (address) {
        bytes memory data = assetType.data;
        if (data.length == 96) {
            // 3 * 32 bytes (address, uint256, address)
            (, , address recipient) = abi.decode(data, (address, uint256, address));
            return recipient;
        } else {
            return address(0);
        }
    }
}
