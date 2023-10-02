// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {IERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import {IERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {LibTransfer} from "./lib/LibTransfer.sol";
import {LibAsset} from "../lib-asset/LibAsset.sol";
import {ITransferExecutor} from "./interfaces/ITransferExecutor.sol";

/// @title abstract contract for TransferExecutor
/// @notice contains transfer functions for any assets as well as ERC20 tokens
abstract contract TransferExecutor is Initializable, ITransferExecutor {
    using LibTransfer for address payable;

    /// @notice limit of assets for each type of bundles
    uint256 public constant MAX_BUNDLE_LIMIT = 20;

    // Bundle Structs
    struct ERC20Details {
        IERC20Upgradeable token;
        uint256 value;
    }

    struct ERC721Details {
        IERC721Upgradeable token;
        uint256 id;
        uint256 value;
    }

    struct ERC1155Details {
        IERC1155Upgradeable token;
        uint256 id;
        uint256 value;
        // bytes data;
    }

    /// @notice function should be able to transfer any supported Asset
    /// @param asset Asset to be transferred
    /// @param from account holding the asset
    /// @param to account that will receive the asset
    function transfer(LibAsset.Asset memory asset, address from, address to) internal override {
        if (asset.assetType.assetClass == LibAsset.AssetClassType.ERC721_ASSET_CLASS) {
            //not using transfer proxy when transferring from this contract
            (address token, uint256 tokenId) = abi.decode(asset.assetType.data, (address, uint256));
            require(asset.value == 1, "erc721 value error");
            if (from == address(this)) {
                IERC721Upgradeable(token).safeTransferFrom(address(this), to, tokenId);
            } else {
                erc721safeTransferFrom(IERC721Upgradeable(token), from, to, tokenId);
            }
        } else if (asset.assetType.assetClass == LibAsset.AssetClassType.ERC20_ASSET_CLASS) {
            //not using transfer proxy when transferring from this contract
            address token = abi.decode(asset.assetType.data, (address));
            if (from == address(this)) {
                SafeERC20Upgradeable.safeTransfer(IERC20Upgradeable(token), to, asset.value);
            } else {
                SafeERC20Upgradeable.safeTransferFrom(IERC20Upgradeable(token), from, to, asset.value);
            }
        } else if (asset.assetType.assetClass == LibAsset.AssetClassType.ERC1155_ASSET_CLASS) {
            //not using transfer proxy when transferring from this contract
            (address token, uint256 tokenId) = abi.decode(asset.assetType.data, (address, uint256));
            if (from == address(this)) {
                IERC1155Upgradeable(token).safeTransferFrom(address(this), to, tokenId, asset.value, "");
            } else {
                erc1155safeTransferFrom(IERC1155Upgradeable(token), from, to, tokenId, asset.value, "");
            }
        }
    }

    /// @notice function for safe transfer of ERC721 tokens
    /// @param token ERC721 token to be transferred
    /// @param from address from which token will be taken
    /// @param to address that will receive token
    /// @param tokenId id of the token being transferred
    function erc721safeTransferFrom(IERC721Upgradeable token, address from, address to, uint256 tokenId) internal {
        token.safeTransferFrom(from, to, tokenId);
    }

    /// @notice function for safe transfer of ERC1155 tokens
    /// @param token ERC1155 token to be transferred
    /// @param from address from which tokens will be taken
    /// @param to address that will receive tokens
    /// @param id id of the tokens being transferred
    /// @param value how many tokens will be transferred
    function erc1155safeTransferFrom(
        IERC1155Upgradeable token,
        address from,
        address to,
        uint256 id,
        uint256 value,
        bytes memory data
    ) internal {
        token.safeTransferFrom(from, to, id, value, data);
    }

    uint256[49] private __gap;
}
