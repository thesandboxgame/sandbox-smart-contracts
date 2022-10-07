// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "../../../common/fx-portal/FxBaseRootTunnelUpgradeable.sol";
import "../../../common/interfaces/IAssetERC1155.sol";
import "../../../common/BaseWithStorage/ERC2771Handler.sol";
import "../../common/ERC1155Receiver.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

/// @title ASSETERC1155 bridge on L1
contract AssetERC1155Tunnel is
    Initializable,
    FxBaseRootTunnelUpgradeable,
    ERC1155Receiver,
    ERC2771Handler,
    OwnableUpgradeable,
    PausableUpgradeable
{
    IAssetERC1155 public rootToken;
    uint256 public maxTransferLimit;
    bool private fetchingAssets = false;

    event SetTransferLimit(uint256 limit);
    event Deposit(address user, uint256 id, uint256 value, bytes data);
    event Withdraw(address user, uint256 id, uint256 value, bytes data);

    // solhint-disable-next-line no-empty-blocks
    constructor() initializer {}

    function initialize(
        address _checkpointManager,
        address _fxRoot,
        IAssetERC1155 _rootToken,
        address trustedForwarder,
        uint256 _maxTransferLimit
    ) public initializer {
        require(address(_rootToken) != address(0), "AssetERC1155Tunnel: _rootToken can't be zero");
        rootToken = _rootToken;
        maxTransferLimit = _maxTransferLimit;
        __Ownable_init();
        __Pausable_init();
        __ERC2771Handler_initialize(trustedForwarder);
        __FxBaseRootTunnelUpgradeable_initialize(_checkpointManager, _fxRoot);
    }

    function setTransferLimit(uint256 _maxTransferLimit) external onlyOwner {
        maxTransferLimit = _maxTransferLimit;
        emit SetTransferLimit(_maxTransferLimit);
    }

    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return
            interfaceId == 0x4e2312e0 || // ERC1155Receiver
            interfaceId == 0x01ffc9a7; // ERC165
    }

    function batchDepositToChild(
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) public whenNotPaused {
        require(ids.length > 0, "MISSING_TOKEN_IDS");
        require(ids.length < maxTransferLimit, "EXCEEDS_TRANSFER_LIMIT");
        bytes32[] memory metadataHashes = new bytes32[](ids.length);
        fetchingAssets = true;
        for (uint256 i = 0; i < ids.length; i++) {
            bytes32 metadataHash = rootToken.metadataHash(ids[i]);
            metadataHashes[i] = metadataHash;
            bytes memory metadata = abi.encode(metadataHash);
            rootToken.safeTransferFrom(_msgSender(), address(this), ids[i], values[i], abi.encode(metadataHash));
            emit Deposit(to, ids[i], values[i], metadata);
        }
        fetchingAssets = false;
        _sendMessageToChild(abi.encode(to, ids, values, abi.encode(metadataHashes)));
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

    function _processMessageFromChild(bytes memory message) internal override {
        (address to, uint256[] memory ids, uint256[] memory values, bytes memory data) =
            abi.decode(message, (address, uint256[], uint256[], bytes));
        bytes32[] memory metadataHashes = abi.decode(data, (bytes32[]));
        for (uint256 i = 0; i < ids.length; i++) {
            bytes memory metadata = abi.encode(metadataHashes[i]);
            if (rootToken.doesHashExist(ids[i])) {
                _depositMinted(to, ids[i], values[i], metadata);
            } else {
                rootToken.mint(to, ids[i], values[i], metadata);
            }
            emit Withdraw(to, ids[i], values[i], metadata);
        }
    }

    function _depositMinted(
        address to,
        uint256 id,
        uint256 value,
        bytes memory data
    ) internal {
        uint256 balance = rootToken.balanceOf(address(this), id);
        if (balance >= value) {
            rootToken.safeTransferFrom(address(this), to, id, value, data);
        } else {
            if (balance > 0) rootToken.safeTransferFrom(address(this), to, id, balance, data);
            rootToken.mintDeficit(to, id, (value - balance));
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
        require(fetchingAssets == true, "AssetERC1155Tunnel: can't directly send Assets");
        return 0xf23a6e61; //bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"))
    }

    function onERC1155BatchReceived(
        address, /*_operator*/
        address, /*_from*/
        uint256[] calldata, /*_ids*/
        uint256[] calldata, /*_values*/
        bytes calldata /*_data*/
    ) external view override returns (bytes4) {
        require(fetchingAssets == true, "AssetERC1155Tunnel: can't directly send Assets");
        return 0xbc197c81; //bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"))
    }
}
