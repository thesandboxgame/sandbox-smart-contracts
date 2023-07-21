//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import {IERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC1155Upgradeable.sol";
import {ERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Receiver.sol";
import {ERC721Holder} from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";

contract MockERC1155MarketPlace4 is ERC1155Receiver, ERC721Holder {
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
        IERC1155Upgradeable(asset).safeTransferFrom(from, to, id, amount, data);
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
        IERC1155Upgradeable(asset).safeBatchTransferFrom(from, to, ids, amounts, data);
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

    function supportsInterface(bytes4 _interfaceId) public view override returns (bool) {
        super.supportsInterface(_interfaceId);
    }
}
