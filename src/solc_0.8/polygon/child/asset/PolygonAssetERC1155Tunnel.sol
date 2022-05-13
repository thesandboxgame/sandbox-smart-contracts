// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "fx-portal/contracts/tunnel/FxBaseChildTunnel.sol";
import "@openzeppelin/contracts-0.8/access/Ownable.sol";
import "@openzeppelin/contracts-0.8/security/Pausable.sol";
import "../../../common/interfaces/IPolygonAssetERC1155.sol";
import "../../common/ERC1155Receiver.sol";
import "../../../common/BaseWithStorage/ERC2771Handler.sol";

import "./PolygonAssetERC1155.sol";

/// @title ASSETERC1155 bridge on L2
contract PolygonAssetERC1155Tunnel is FxBaseChildTunnel, ERC1155Receiver, ERC2771Handler, Ownable, Pausable {
    IPolygonAssetERC1155 public childToken;
    uint256 public maxTransferLimit = 20;

    event SetTransferLimit(uint256 limit);
    event Deposit(address user, uint256 id, uint256 value, bytes data);
    event Withdraw(address user, uint256 id, uint256 value, bytes data);

    function setTransferLimit(uint256 _maxTransferLimit) external onlyOwner {
        maxTransferLimit = _maxTransferLimit;
        emit SetTransferLimit(_maxTransferLimit);
    }

    constructor(
        address _fxChild,
        IPolygonAssetERC1155 _childToken,
        address _trustedForwarder,
        uint256 _maxTransferLimit
    ) FxBaseChildTunnel(_fxChild) {
        childToken = _childToken;
        maxTransferLimit = _maxTransferLimit;
        __ERC2771Handler_initialize(_trustedForwarder);
    }

    function batchWithdrawToRoot(
        address to,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data // Must contain encoded bytes32[] of metadata hashes from root contract
    ) external whenNotPaused {
        require(ids.length > 0, "MISSING_TOKEN_IDS");
        require(data.length > 0, "MISSING_METADATAHASHES");
        require(ids.length < maxTransferLimit, "EXCEEDS_TRANSFER_LIMIT");
        bytes32[] memory metadataHashes = abi.decode(data, (bytes32[]));
        for (uint256 i = 0; i < ids.length; i++) {
            bytes memory metadata = abi.encode(["bytes"], [metadataHashes[i]]);
            childToken.safeTransferFrom(_msgSender(), address(this), ids[i], values[i], metadata);
            emit Withdraw(to, ids[i], values[i], metadata);
        }
        _sendMessageToRoot(abi.encode(to, ids, values, data));
    }

    /// @dev Change the address of the trusted forwarder for meta-TX
    /// @param trustedForwarder The new trustedForwarder
    function setTrustedForwarder(address trustedForwarder) external onlyOwner {
        _trustedForwarder = trustedForwarder;
    }

    /// @dev Pauses all token transfers across bridge
    function pause() public onlyOwner {
        _pause();
    }

    /// @dev Unpauses all token transfers across bridge
    function unpause() public onlyOwner {
        _unpause();
    }

    function _processMessageFromRoot(
        uint256, /* stateId */
        address sender,
        bytes memory data
    ) internal override validateSender(sender) {
        _syncDeposit(data);
    }

    function _syncDeposit(bytes memory syncData) internal {
        (address to, uint256 id, uint256 value, bytes memory data) =
            abi.decode(syncData, (address, uint256, uint256, bytes));
        if (childToken.wasEverMinted(id)) {
            _depositMinted(to, id, value, data);
        } else {
            childToken.mint(to, id, value, data);
        }

        emit Deposit(to, id, value, data);
    }

    function _depositMinted(
        address to,
        uint256 id,
        uint256 value,
        bytes memory data
    ) internal {
        uint256 balance = childToken.balanceOf(address(this), id);
        if (balance >= value) {
            childToken.safeTransferFrom(address(this), to, id, value, data);
        } else {
            if (balance > 0) childToken.safeTransferFrom(address(this), to, id, balance, data);
            childToken.mintDeficit(to, id, (value - balance));
        }
    }

    function _msgSender() internal view override(Context, ERC2771Handler) returns (address sender) {
        return ERC2771Handler._msgSender();
    }

    function _msgData() internal view override(Context, ERC2771Handler) returns (bytes calldata) {
        return ERC2771Handler._msgData();
    }

    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return
            interfaceId == 0x4e2312e0 || // ERC1155Receiver
            interfaceId == 0x01ffc9a7; // ERC165
    }
}
