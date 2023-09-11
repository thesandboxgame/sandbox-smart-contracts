// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {TransferManager} from "../TransferManager.sol";
import {LibERC721LazyMint} from "../../lazy-mint/erc-721/LibERC721LazyMint.sol";
import {LibERC1155LazyMint, LibPart} from "../../lazy-mint/erc-1155/LibERC1155LazyMint.sol";
import {TransferExecutor, LibAsset} from "../TransferExecutor.sol";

contract SimpleTest is TransferManager, TransferExecutor {
    function getRoyaltiesByAssetTest(LibAsset.AssetType memory matchNft) external returns (LibPart.Part[] memory) {
        return getRoyaltiesByAssetType(matchNft);
    }

    function encode721(LibERC721LazyMint.Mint721Data memory data) external view returns (bytes memory) {
        return abi.encode(address(this), data);
    }

    function encode1155(LibERC1155LazyMint.Mint1155Data memory data) external view returns (bytes memory) {
        return abi.encode(address(this), data);
    }
}
