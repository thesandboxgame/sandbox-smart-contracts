// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {LibERC1155LazyMint} from "../lazy-mint/erc-1155/LibERC1155LazyMint.sol";
import {IERC1155LazyMint} from "../lazy-mint/erc-1155/IERC1155LazyMint.sol";
import {LibERC721LazyMint} from "../lazy-mint/erc-721/LibERC721LazyMint.sol";
import {IERC721LazyMint} from "../lazy-mint/erc-721/IERC721LazyMint.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {IERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import {IERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
import {ITransferExecutor} from "./interfaces/ITransferExecutor.sol";

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import {LibTransfer} from "./lib/LibTransfer.sol";
import {LibAsset} from "../lib-asset/LibAsset.sol";

/// @title abstract contract for TransferExecutor
/// @notice contains transfer functions for any assets as well as ERC20 tokens
abstract contract TransferExecutor is Initializable, OwnableUpgradeable, ITransferExecutor {
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
        if (asset.assetType.assetClass == LibAsset.ERC721_ASSET_CLASS) {
            //not using transfer proxy when transferring from this contract
            (address token, uint256 tokenId) = abi.decode(asset.assetType.data, (address, uint256));
            require(asset.value == 1, "erc721 value error");
            if (from == address(this)) {
                IERC721Upgradeable(token).safeTransferFrom(address(this), to, tokenId);
            } else {
                erc721safeTransferFrom(IERC721Upgradeable(token), from, to, tokenId);
            }
        } else if (asset.assetType.assetClass == LibAsset.ERC20_ASSET_CLASS) {
            //not using transfer proxy when transferring from this contract
            address token = abi.decode(asset.assetType.data, (address));
            if (from == address(this)) {
                require(IERC20Upgradeable(token).transfer(to, asset.value), "erc20 transfer failed");
            } else {
                erc20safeTransferFrom(IERC20Upgradeable(token), from, to, asset.value);
            }
        } else if (asset.assetType.assetClass == LibAsset.ERC1155_ASSET_CLASS) {
            //not using transfer proxy when transferring from this contract
            (address token, uint256 tokenId) = abi.decode(asset.assetType.data, (address, uint256));
            if (from == address(this)) {
                IERC1155Upgradeable(token).safeTransferFrom(address(this), to, tokenId, asset.value, "");
            } else {
                erc1155safeTransferFrom(IERC1155Upgradeable(token), from, to, tokenId, asset.value, "");
            }
        } else if (asset.assetType.assetClass == LibAsset.ETH_ASSET_CLASS) {
            if (to != address(this)) {
                payable(to).transferEth(asset.value);
            }
        } else if (asset.assetType.assetClass == LibAsset.BUNDLE) {
            // unpack the asset data
            ERC20Details[] memory erc20Details;
            ERC721Details[] memory erc721Details;
            ERC1155Details[] memory erc1155Details;

            (erc20Details, erc721Details, erc1155Details) = abi.decode(
                asset.assetType.data,
                (ERC20Details[], ERC721Details[], ERC1155Details[])
            );

            // check if bundles don't exceed the limit
            require(erc20Details.length <= MAX_BUNDLE_LIMIT, "erc20 limit exceeded");
            require(erc721Details.length <= MAX_BUNDLE_LIMIT, "erc721 limit exceeded");
            require(erc1155Details.length <= MAX_BUNDLE_LIMIT, "erc1155 limit exceeded");

            // transfer ERC20
            for (uint256 i; i < erc20Details.length; ) {
                if (from == address(this)) {
                    require(
                        erc20Details[i].token.transferFrom(from, to, erc20Details[i].value),
                        "erc20 bundle transfer failed"
                    );
                } else {
                    erc20safeTransferFrom(erc20Details[i].token, from, to, erc20Details[i].value);
                }

                unchecked {
                    ++i;
                }
            }

            // transfer ERC721 assets
            for (uint256 i; i < erc721Details.length; ) {
                require(erc721Details[i].value == 1, "erc721 value error");
                if (from == address(this)) {
                    erc721Details[i].token.safeTransferFrom(address(this), to, erc721Details[i].id);
                } else {
                    erc721safeTransferFrom(erc721Details[i].token, from, to, erc721Details[i].id);
                }

                unchecked {
                    ++i;
                }
            }

            // transfer ERC1155 assets
            for (uint256 i; i < erc1155Details.length; ) {
                if (from == address(this)) {
                    erc1155Details[i].token.safeTransferFrom(
                        address(this),
                        to,
                        erc1155Details[i].id,
                        erc1155Details[i].value,
                        ""
                    );
                } else {
                    erc1155safeTransferFrom(
                        erc1155Details[i].token,
                        from,
                        to,
                        erc1155Details[i].id,
                        erc1155Details[i].value,
                        ""
                    );
                }

                unchecked {
                    ++i;
                }
            }
        } else {
            lazyTransfer(asset, from, to);
        }
    }

    /// @notice function for safe transfer of ERC20 tokens
    /// @param token ERC20 token to be transferred
    /// @param from address from which tokens will be taken
    /// @param to address that will receive tokens
    /// @param value how many tokens are going to be transferred
    function erc20safeTransferFrom(IERC20Upgradeable token, address from, address to, uint256 value) internal {
        require(token.transferFrom(from, to, value), "failure while transferring");
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

    /// @notice function for lazy transfer
    /// @param asset asset that will be lazy transferred
    /// @param from address that minted token
    /// @param to address that will receive tokens
    function lazyTransfer(LibAsset.Asset memory asset, address from, address to) internal {
        if (asset.assetType.assetClass == LibERC721LazyMint.ERC721_LAZY_ASSET_CLASS) {
            require(asset.value == 1, "erc721 value error");
            (address token, LibERC721LazyMint.Mint721Data memory data) = abi.decode(
                asset.assetType.data,
                (address, LibERC721LazyMint.Mint721Data)
            );
            IERC721LazyMint(token).transferFromOrMint(data, from, to);
        } else if (asset.assetType.assetClass == LibERC1155LazyMint.ERC1155_LAZY_ASSET_CLASS) {
            (address token, LibERC1155LazyMint.Mint1155Data memory data) = abi.decode(
                asset.assetType.data,
                (address, LibERC1155LazyMint.Mint1155Data)
            );
            IERC1155LazyMint(token).transferFromOrMint(data, from, to, asset.value);
        }
    }

    uint256[49] private __gap;
}
