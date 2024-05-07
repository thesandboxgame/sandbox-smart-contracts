// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import {IERC2981} from "@openzeppelin/contracts/interfaces/IERC2981.sol";
import {IERC721} from "@openzeppelin/contracts/interfaces/IERC721.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {IERC721BatchOps} from "../interfaces/IERC721BatchOps.sol";

contract MarketPlaceMock {
    bytes4 private constant ERC721_IS_RECEIVER = 0x150b7a02;
    bytes4 private constant ERC721_RECEIVED = 0x150b7a02;

    error ERC20TokenAmountCantBeZero();
    /// @notice Transfers `value` tokens of type `id` from  `from` to `to`  (with safety call).
    /// @param land the contract address on which the token transfer will take place
    /// @param from adderess from which tokens are transfered.
    /// @param to address to which the token will be transfered.
    /// @param id the token type transfered.
    /// @param data aditional data accompanying the transfer.
    function transferLand(address land, address from, address to, uint256 id, bytes memory data) external {
        IERC721(land).safeTransferFrom(from, to, id, data);
    }

    /// @notice Transfer tokens with given ids ensuring the receiving contract has a receiver method.
    /// @param land the contract address on which the token transfer will take place
    /// @param from The sender of the tokens.
    /// @param to The recipient of the tokens.
    /// @param id The id of the token to be transferred.
    function transferLand(address land, address from, address to, uint256 id) external {
        IERC721(land).safeTransferFrom(from, to, id);
    }

    /// @notice Transfer tokens with given ids ensuring the receiving contract has a receiver method.
    /// @param asset the contract address on which the token transfer will take place
    /// @param from Address whose token is to be transferred.
    /// @param to Recipient.
    /// @param id The token id to be transferred.
    function transferTokenERC721(address asset, address from, address to, uint256 id) external {
        IERC721(asset).safeTransferFrom(from, to, id);
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
        IERC721BatchOps(asset).batchTransferFrom(from, to, ids, data);
    }

    /// @notice Transfer tokens with given ids ensuring the receiving contract has a receiver method.
    /// @param asset the contract address on which the token transfer will take place
    /// @param from The sender of the tokens.
    /// @param to The recipient of the tokens.
    /// @param ids The ids of the tokens to be transferred.
    /// @param data Additional data.
    function safeBatchTransferTokenERC721(
        address asset,
        address from,
        address to,
        uint256[] memory ids,
        bytes memory data
    ) external {
        IERC721BatchOps(asset).safeBatchTransferFrom(from, to, ids, data);
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return ERC721_RECEIVED;
    }

    function supportsInterface(bytes4 _interfaceId) external pure returns (bool) {
        return _interfaceId == 0x01ffc9a7 || _interfaceId == ERC721_IS_RECEIVER;
    }

    function distributeRoyaltyEIP2981(
        uint256 erc20TokenAmount,
        IERC20 erc20Contract,
        address nftContract,
        uint256 nftId,
        address nftBuyer,
        address nftSeller
    ) external payable {
        if (erc20TokenAmount == 0) {
            revert ERC20TokenAmountCantBeZero();
        }
        (address royaltyReceiver, uint256 value) = IERC2981(nftContract).royaltyInfo(nftId, erc20TokenAmount);
        erc20Contract.transferFrom(nftBuyer, royaltyReceiver, value);
        erc20Contract.transferFrom(nftBuyer, nftSeller, (erc20TokenAmount - value));
        IERC721(nftContract).safeTransferFrom(nftSeller, nftBuyer, nftId, "0x");
    }
}
