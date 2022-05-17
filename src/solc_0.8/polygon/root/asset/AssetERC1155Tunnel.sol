// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "fx-portal/contracts/tunnel/FxBaseRootTunnel.sol";
import "../../../common/interfaces/IAssetERC1155.sol";
import "../../../common/BaseWithStorage/ERC2771Handler.sol";
import "../../common/ERC1155Receiver.sol";
import "@openzeppelin/contracts-0.8/access/Ownable.sol";
import "@openzeppelin/contracts-0.8/security/Pausable.sol";

/// @title ASSETERC1155 bridge on L1
contract AssetERC1155Tunnel is FxBaseRootTunnel, ERC1155Receiver, ERC2771Handler, Ownable, Pausable {
    IAssetERC1155 public rootToken;
    uint256 public maxTransferLimit = 20;

    event SetTransferLimit(uint256 limit);
    event Deposit(address user, uint256 id, uint256 value, bytes data);
    event Withdraw(address user, uint256 id, uint256 value, bytes data);

    function setTransferLimit(uint256 _maxTransferLimit) external onlyOwner {
        maxTransferLimit = _maxTransferLimit;
        emit SetTransferLimit(_maxTransferLimit);
    }

    constructor(
        address _checkpointManager,
        address _fxRoot,
        IAssetERC1155 _rootToken,
        address _trustedForwarder,
        uint256 _maxTransferLimit
    ) FxBaseRootTunnel(_checkpointManager, _fxRoot) {
        rootToken = _rootToken;
        maxTransferLimit = _maxTransferLimit;
        __ERC2771Handler_initialize(_trustedForwarder);
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
    ) public whenNotPaused() {
        require(ids.length > 0, "MISSING_TOKEN_IDS");
        require(ids.length < maxTransferLimit, "EXCEEDS_TRANSFER_LIMIT");
        bytes32[] memory metadataHashes = new bytes32[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            bytes32 metadataHash = rootToken.metadataHash(ids[i]);
            metadataHashes[i] = metadataHash;
            bytes memory metadata = abi.encode(metadataHash);
            rootToken.safeTransferFrom(_msgSender(), address(this), ids[i], values[i], abi.encode(metadataHash));
            emit Deposit(to, ids[i], values[i], metadata);
        }
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
            if (rootToken.wasEverMinted(ids[i])) {
                _depositMinted(to, ids[i], values[i], metadata);
            } else {
                rootToken.mint(to, ids[index], values[index], metadata);
            }
            emit Withdraw(to, ids[index], values[index], metadata);
        }
    }

    function _msgSender() internal view override(Context, ERC2771Handler) returns (address sender) {
        return ERC2771Handler._msgSender();
    }

    function _msgData() internal view override(Context, ERC2771Handler) returns (bytes calldata) {
        return ERC2771Handler._msgData();
    }
}
