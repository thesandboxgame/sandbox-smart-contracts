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

    uint256 internal _expiryTime;

    mapping(address => bool) public claimed;

    constructor(
        address asset,
        bytes32 merkleRoot,
        address assetsHolder,
        uint256 expiryTime
    ) ClaimERC1155(IERC1155(asset), merkleRoot, assetsHolder) {
        _expiryTime = expiryTime;
    }

    function claimAssets(
        address from,
        address to,
        uint256[] calldata assetIds,
        uint256[] calldata assetValues,
        bytes32[] calldata proof,
        bytes32 salt
    ) external {
        require(block.timestamp < _expiryTime, "CLAIM_PERIOD_IS_OVER");
        require(claimed[to] == false, "DESTINATION_ALREADY_CLAIMED");
        _checkAuthorization(from, to);
        claimed[to] = true;
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

    function _checkAuthorization(address from, address to) internal view {
        require(to != address(0), "INVALID_TO_ZERO_ADDRESS");
        if (from != msg.sender) {
            uint256 processorType = _metaTransactionContracts[msg.sender];
            require(processorType != 0, "INVALID SENDER");
            if (processorType == METATX_2771) {
                require(from == _forceMsgSender(), "INVALID_SENDER");
            }
        }
    }
}
