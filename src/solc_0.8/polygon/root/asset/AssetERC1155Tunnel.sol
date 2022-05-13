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

    event Deposit(address user, uint256 id, uint256 value, bytes data);
    event Withdraw(address user, uint256 id, uint256 value, bytes data);

    constructor(
        address _checkpointManager,
        address _fxRoot,
        IAssetERC1155 _rootToken,
        address _trustedForwarder
    ) FxBaseRootTunnel(_checkpointManager, _fxRoot) {
        rootToken = _rootToken;
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
        uint256[] memory values,
        bytes calldata data
    ) public whenNotPaused() {
        require(ids.length > 0, "MISSING_TOKEN_IDS");
        rootToken.safeBatchTransferFrom(_msgSender(), address(this), ids, values, data);
        for (uint256 index = 0; index < ids.length; index++) {
            uint256 id = ids[index];
            bytes memory message = abi.encode(to, id, values[index], data);
            _sendMessageToChild(message);
            emit Deposit(to, id, values[index], data);
        }
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
        for (uint256 index = 0; index < ids.length; index++) {
            bytes memory metadata = abi.encode(metadataHashes[index]);
            if (rootToken.wasEverMinted(ids[index])) {
                _depositMinted(to, ids[index], values[index], metadata);
            } else {
                rootToken.mint(to, ids[index], values[index], metadata);
            }
            emit Withdraw(to, ids[index], values[index], metadata);
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

    function _msgSender() internal view override(Context, ERC2771Handler) returns (address sender) {
        return ERC2771Handler._msgSender();
    }

    function _msgData() internal view override(Context, ERC2771Handler) returns (bytes calldata) {
        return ERC2771Handler._msgData();
    }
}
