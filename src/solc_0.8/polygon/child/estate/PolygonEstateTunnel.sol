// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "fx-portal/contracts/tunnel/FxBaseChildTunnel.sol";
import "@openzeppelin/contracts-0.8/access/Ownable.sol";
import "@openzeppelin/contracts-0.8/security/Pausable.sol";

import "../../../common/interfaces/IERC721MandatoryTokenReceiver.sol";
import "../../../common/BaseWithStorage/ERC2771Handler.sol";
import "../../../common/interfaces/IPolygonEstateToken.sol";

/// @title Estate bridge on L2
contract PolygonEstateTunnel is FxBaseChildTunnel, IERC721MandatoryTokenReceiver, ERC2771Handler, Ownable, Pausable {
    IPolygonEstateToken public childToken;

    event Withdraw(uint256 estateId, address from, address to);
    event Deposit(uint256 estateId, address to, bytes32 metadata, TileWithCoordLib.TileWithCoord[] freeLands);

    constructor(
        address _fxChild,
        IPolygonEstateToken _childToken,
        address _trustedForwarder,
        uint32 _maxGasLimit,
        uint256 _maxAllowedQuads,
        uint32[5] memory limits
    ) FxBaseChildTunnel(_fxChild) {
        childToken = _childToken;
        __ERC2771Handler_initialize(_trustedForwarder);
    }

    function transferEstateToL1(address to, uint256 estateId) external whenNotPaused() {
        (bytes32 metadata, TileWithCoordLib.TileWithCoord[] memory tiles) =
            childToken.burnEstate(_msgSender(), estateId);
        emit Withdraw(estateId, _msgSender(), to);
        _sendMessageToRoot(abi.encode(to, metadata, tiles));
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
        (address to, bytes32 metadata, TileWithCoordLib.TileWithCoord[] memory freeLands) =
            abi.decode(data, (address, bytes32, TileWithCoordLib.TileWithCoord[]));
        uint256 estateId = childToken.mintEstate(to, metadata, freeLands);
        emit Deposit(estateId, to, metadata, freeLands);
    }

    function _msgSender() internal view override(Context, ERC2771Handler) returns (address sender) {
        return ERC2771Handler._msgSender();
    }

    function _msgData() internal view override(Context, ERC2771Handler) returns (bytes calldata) {
        return ERC2771Handler._msgData();
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
}
