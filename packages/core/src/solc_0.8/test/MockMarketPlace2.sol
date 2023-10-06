//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;
import {IAssetERC721} from "../common/interfaces/IAssetERC721.sol";
import {IAssetERC1155} from "../common/interfaces/IAssetERC1155.sol";
import {ILandTokenV3} from "../common/interfaces/ILandTokenV3.sol";

contract MockMarketPlace2 {
    bytes4 private constant ERC721_IS_RECEIVER = 0x150b7a02;
    bytes4 private constant ERC721_RECEIVED = 0x150b7a02;
    bytes4 private constant ERC1155_IS_RECEIVER = 0x4e2312e0;
    bytes4 private constant ERC1155_RECEIVED = 0xf23a6e61;
    bytes4 private constant ERC1155_BATCH_RECEIVED = 0xbc197c81;

    /// @notice Transfers `value` tokens of type `id` from  `from` to `to`  (with safety call).
    /// @param asset the contract address on which the token transfer will take place
    /// @param from address from which tokens are transfered.
    /// @param to address to which the token will be transfered.
    /// @param id the token type transfered.
    /// @param amount amount of token transfered.
    /// @param data aditional data accompanying the transfer.
    function transferTokenForERC1155(
        address asset,
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) external {
        IAssetERC1155(asset).safeTransferFrom(from, to, id, amount, data);
    }

    /// @notice Transfers `value` tokens of type `id` from  `from` to `to`  (with safety call).
    /// @param land the contract address on which the token transfer will take place
    /// @param from address from which tokens are transfered.
    /// @param to address to which the token will be transfered.
    /// @param id the token type transfered.
    /// @param data aditional data accompanying the transfer.
    function transferLand(
        address land,
        address from,
        address to,
        uint256 id,
        bytes memory data
    ) external {
        ILandTokenV3(land).safeTransferFrom(from, to, id, data);
    }

    /// @notice Transfer tokens with given ids ensuring the receiving contract has a receiver method.
    /// @param asset the contract address on which the token transfer will take place
    /// @param from Address whose token is to be transferred.
    /// @param to Recipient.
    /// @param id The token id to be transferred.
    function transferTokenERC721(
        address asset,
        address from,
        address to,
        uint256 id
    ) external {
        IAssetERC721(asset).safeTransferFrom(from, to, id);
    }

    /// @notice Transfers `values` tokens of type `ids` from  `from` to `to` (with safety call).
    /// @param asset the contract address on which the token transfer will take place
    /// @param from address from which tokens are transfered.
    /// @param to address to which the token will be transfered.
    /// @param ids ids of each token type transfered.
    /// @param amounts amount of each token type transfered.
    /// @param data aditional data accompanying the transfer.
    function batchTransferTokenERC1155(
        address asset,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) external {
        IAssetERC1155(asset).safeBatchTransferFrom(from, to, ids, amounts, data);
    }

    /// @notice Transfer tokens with given ids ensuring the receiving contract has a receiver method.
    /// @param asset the contract address on which the token transfer will take place
    /// @param from The sender of the tokens.
    /// @param to The recipient of the tokens.
    /// @param ids The ids of the tokens to be transferred.
    /// @param data Additional data.
    function batchTransferTokenERC721(
        address asset,
        address from,
        address to,
        uint256[] memory ids,
        bytes memory data
    ) external {
        IAssetERC721(asset).safeBatchTransferFrom(from, to, ids, data);
    }

    /// @notice Transfer tokens with given ids ensuring the receiving contract has a receiver method.
    /// @param land the contract address on which the token transfer will take place
    /// @param from The sender of the tokens.
    /// @param to The recipient of the tokens.
    /// @param id The id of the token to be transferred.
    function transferLand(
        address land,
        address from,
        address to,
        uint256 id
    ) external {
        ILandTokenV3(land).safeTransferFrom(from, to, id);
    }

    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return ERC1155_RECEIVED;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) external pure returns (bytes4) {
        return ERC1155_BATCH_RECEIVED;
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return ERC721_RECEIVED;
    }

    function supportsInterface(bytes4 _interfaceId) external pure returns (bool) {
        return _interfaceId == 0x01ffc9a7 || _interfaceId == ERC1155_IS_RECEIVER || _interfaceId == ERC721_IS_RECEIVER;
    }
}
