//SPDX-License-Identifier: MIT
pragma solidity 0.7.1;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "./ClaimERC1155.sol";
import "../common/BaseWithStorage/WithMetaTransaction.sol";
import "../common/BaseWithStorage/WithAdmin.sol";

contract AssetGiveaway is WithAdmin, WithMetaTransaction, ClaimERC1155 {
    using SafeMath for uint256;

    bytes4 private constant ERC1155_RECEIVED = 0xf23a6e61;
    bytes4 private constant ERC1155_BATCH_RECEIVED = 0xbc197c81;

    constructor(
        address asset,
        bytes32 merkleRoot,
        address assetsHolder
    ) ClaimERC1155(IERC1155(asset), merkleRoot, assetsHolder) {}

    // TODO: add _expiryTime for giveaway

    function claimAssets(
        address from,
        address to,
        uint256[] calldata assetIds,
        uint256[] calldata assetValues,
        bytes32[] calldata proof,
        bytes32 salt
    ) external {
        require(msg.sender == from || _metaTransactionContracts[msg.sender] > 0, "INVALID_SENDER"); // TODO: check bool
        // require(block.timestamp < _expiryTime, "CLAIM_PERIOD_IS_OVER");
        require(to != address(0), "DESTINATION_ZERO_ADDRESS");
        _claimERC1155(from, to, assetIds, assetValues, proof, salt);
    }

    function onERC1155BatchReceived(
        address operator,
        address, /*from*/
        uint256[] calldata, /*ids*/
        uint256[] calldata, /*values*/
        bytes calldata /*data*/
    ) external view returns (bytes4) {
        if (operator == address(this)) {
            return ERC1155_BATCH_RECEIVED;
        }
        revert("ERC1155_BATCH_REJECTED");
    }

    function onERC1155Received(
        address operator,
        address, /*from*/
        uint256, /*id*/
        uint256, /*value*/
        bytes calldata /*data*/
    ) external view returns (bytes4) {
        if (operator == address(this)) {
            return ERC1155_RECEIVED;
        }
        revert("ERC1155_REJECTED");
    }
}
