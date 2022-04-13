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
    IAssetERC721 public rootToken;

    event Deposit(address user, uint256 id, bytes data);
    event Withdraw(address user, uint256 id, bytes data);

    constructor(
        address _checkpointManager,
        address _fxRoot,
        IAssetERC721 _rootToken,
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

    function batchDepositToChild(address to, uint256[] memory ids) public whenNotPaused() {
        for (uint256 i = 0; i < ids.length; i++) {
            // lock the root tokens in this contract
            uint256 id = ids[i];
            bytes memory uniqueUriData = abi.encode(rootToken.tokenURI(id));
            rootToken.safeTransferFrom(_msgSender(), address(this), ids[i], uniqueUriData);
            _sendMessageToChild(abi.encode(to, ids[i], uniqueUriData));
            emit Deposit(to, ids[i], uniqueUriData);
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
        (address to, uint256 id, bytes memory data) = abi.decode(message, (address, uint256, bytes));
        if (!rootToken.exists(id)) rootToken.mint(to, id, data);
        else rootToken.safeTransferFrom(address(this), to, id, data);
        emit Withdraw(to, id, data);
    }

    function _msgSender() internal view override(Context, ERC2771Handler) returns (address sender) {
        return ERC2771Handler._msgSender();
    }

    function _msgData() internal view override(Context, ERC2771Handler) returns (bytes calldata) {
        return ERC2771Handler._msgData();
    }
}
