// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "fx-portal/contracts/tunnel/FxBaseRootTunnel.sol";
import "../../../common/interfaces/IAssetERC721.sol";
import "../../../common/interfaces/IERC721MandatoryTokenReceiver.sol";
import "../../../common/BaseWithStorage/ERC2771Handler.sol";
import "@openzeppelin/contracts-0.8/access/Ownable.sol";
import "@openzeppelin/contracts-0.8/security/Pausable.sol";

/// @title ASSETERC721 bridge on L1
contract AssetERC721Tunnel is FxBaseRootTunnel, IERC721MandatoryTokenReceiver, ERC2771Handler, Ownable, Pausable {
    address public rootToken;

    event Deposit(address user, uint256 id, bytes data);
    event Withdraw(address user, uint256 id, bytes data);

    constructor(
        address _checkpointManager,
        address _fxRoot,
        address _rootToken,
        address _trustedForwarder
    ) FxBaseRootTunnel(_checkpointManager, _fxRoot) {
        rootToken = _rootToken;
        __ERC2771Handler_initialize(_trustedForwarder);
    }

    function onERC721Received(
        address, /* operator */
        address, /* from */
        uint256, /* tokenId */
        bytes calldata /* data */
    ) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }

    function onERC721BatchReceived(
        address, /* operator */
        address, /* from */
        uint256[] calldata, /* ids */
        bytes calldata /* data */
    ) external pure override returns (bytes4) {
        return this.onERC721BatchReceived.selector;
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x5e8bf644 || interfaceId == 0x01ffc9a7;
    }

    function batchTransferToL2(
        address to,
        uint256[] memory ids,
        bytes memory data // TODO: test data format
    ) public whenNotPaused() {
        IAssetERC721(rootToken).safeBatchTransferFrom(_msgSender(), address(this), ids, data);

        for (uint256 index = 0; index < ids.length; index++) {
            bytes memory message = abi.encode(to, ids[index], data);
            _sendMessageToChild(message);
            emit Deposit(to, ids[index], data);
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
        (address to, uint256[] memory ids, bytes memory data) = abi.decode(message, (address, uint256[], bytes));
        for (uint256 index = 0; index < ids.length; index++) {
            IAssetERC721(rootToken).safeTransferFrom(address(this), to, ids[index], data); // TODO: test data format
            emit Withdraw(to, ids[index], data);
        }
    }

    function _msgSender() internal view override(Context, ERC2771Handler) returns (address sender) {
        return ERC2771Handler._msgSender();
    }

    function _msgData() internal view override(Context, ERC2771Handler) returns (bytes calldata) {
        return ERC2771Handler._msgData();
    }
}
