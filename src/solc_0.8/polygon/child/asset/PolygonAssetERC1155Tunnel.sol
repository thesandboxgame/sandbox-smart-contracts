// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "../../../common/fx-portal/FxBaseChildTunnelUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

import "../../../common/interfaces/IPolygonAssetERC1155.sol";
import "../../common/ERC1155Receiver.sol";
import "../../../common/BaseWithStorage/ERC2771Handler.sol";

import "./PolygonAssetERC1155.sol";

/// @title ASSETERC1155 bridge on L2
contract PolygonAssetERC1155Tunnel is
    Initializable,
    FxBaseChildTunnelUpgradeable,
    ERC1155Receiver,
    ERC2771Handler,
    OwnableUpgradeable,
    PausableUpgradeable
{
    IPolygonAssetERC1155 public childToken;
    uint256 public maxTransferLimit;
    bool private fetchingAssets = false;

    event SetTransferLimit(uint256 limit);
    event Deposit(address user, uint256 id, uint256 value, bytes data);
    event Withdraw(address user, uint256 id, uint256 value, bytes data);

    // solhint-disable-next-line no-empty-blocks
    constructor() initializer {}

    function initialize(
        address _fxChild,
        IPolygonAssetERC1155 _childToken,
        address trustedForwarder,
        uint256 _maxTransferLimit
    ) public initializer {
        require(address(_childToken) != address(0), "PolygonAssetERC1155Tunnel: _childToken can't be zero");
        childToken = _childToken;
        maxTransferLimit = _maxTransferLimit;
        __Ownable_init();
        __Pausable_init();
        __ERC2771Handler_initialize(trustedForwarder);
        __FxBaseChildTunnelUpgradeable_initialize(_fxChild);
    }

    function setTransferLimit(uint256 _maxTransferLimit) external onlyOwner {
        maxTransferLimit = _maxTransferLimit;
        emit SetTransferLimit(_maxTransferLimit);
    }

    function batchWithdrawToRoot(
        address to,
        uint256[] calldata ids,
        uint256[] calldata values
    ) external whenNotPaused {
        require(to != address(0), "PolygonAssetERC1155Tunnel: to can't be zero");
        require(ids.length > 0, "MISSING_TOKEN_IDS");
        require(ids.length < maxTransferLimit, "EXCEEDS_TRANSFER_LIMIT");
        bytes32[] memory metadataHashes = new bytes32[](ids.length);
        fetchingAssets = true;
        for (uint256 i = 0; i < ids.length; i++) {
            bytes32 metadataHash = childToken.metadataHash(ids[i]);
            metadataHashes[i] = metadataHash;
            bytes memory metadata = abi.encode(metadataHash);
            childToken.safeTransferFrom(_msgSender(), address(this), ids[i], values[i], abi.encode(metadataHash));
            emit Withdraw(to, ids[i], values[i], metadata);
        }
        fetchingAssets = false;
        _sendMessageToRoot(abi.encode(to, ids, values, abi.encode(metadataHashes)));
    }

    /// @dev Change the address of the trusted forwarder for meta-TX
    /// @param trustedForwarder The new trustedForwarder
    function setTrustedForwarder(address trustedForwarder) external onlyOwner {
        _trustedForwarder = trustedForwarder;
    }

    /// @dev Pauses all token transfers across bridge
    function pause() external onlyOwner {
        _pause();
    }

    /// @dev Unpauses all token transfers across bridge
    function unpause() external onlyOwner {
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
        (address to, uint256[] memory ids, uint256[] memory values, bytes memory data) =
            abi.decode(syncData, (address, uint256[], uint256[], bytes));
        bytes32[] memory metadataHashes = abi.decode(data, (bytes32[]));
        for (uint256 i = 0; i < ids.length; i++) {
            bytes memory metadata = abi.encode(metadataHashes[i]);
            if (childToken.doesHashExist(ids[i])) {
                _depositMinted(to, ids[i], values[i], metadata);
            } else {
                childToken.mint(to, ids[i], values[i], metadata);
            }
            emit Deposit(to, ids[i], values[i], metadata);
        }
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

    function _msgSender() internal view override(ContextUpgradeable, ERC2771Handler) returns (address sender) {
        return ERC2771Handler._msgSender();
    }

    function _msgData() internal view override(ContextUpgradeable, ERC2771Handler) returns (bytes calldata) {
        return ERC2771Handler._msgData();
    }

    function onERC1155Received(
        address, /*_operator*/
        address, /*_from*/
        uint256, /*_id*/
        uint256, /*_value*/
        bytes calldata /*_data*/
    ) external view override returns (bytes4) {
        require(fetchingAssets == true, "PolygonAssetERC1155Tunnel: can't directly send Assets");
        return 0xf23a6e61; //bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"))
    }

    function onERC1155BatchReceived(
        address, /*_operator*/
        address, /*_from*/
        uint256[] calldata, /*_ids*/
        uint256[] calldata, /*_values*/
        bytes calldata /*_data*/
    ) external view override returns (bytes4) {
        require(fetchingAssets == true, "PolygonAssetERC1155Tunnel: can't directly send Assets");
        return 0xbc197c81; //bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"))
    }

    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return
            interfaceId == 0x4e2312e0 || // ERC1155Receiver
            interfaceId == 0x01ffc9a7; // ERC165
    }
}
