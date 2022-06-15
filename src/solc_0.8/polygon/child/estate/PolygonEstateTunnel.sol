// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {FxBaseChildTunnel} from "fx-portal/contracts/tunnel/FxBaseChildTunnel.sol";
import {Ownable} from "@openzeppelin/contracts-0.8/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts-0.8/security/Pausable.sol";
import {Context} from "@openzeppelin/contracts-0.8/utils/Context.sol";
import {IERC721MandatoryTokenReceiver} from "../../../common/interfaces/IERC721MandatoryTokenReceiver.sol";
import {ERC2771Handler} from "../../../common/BaseWithStorage/ERC2771Handler.sol";
import {IEstateToken} from "../../../common/interfaces/IEstateToken.sol";
import {TileWithCoordLib} from "../../../common/Libraries/TileWithCoordLib.sol";

/// @title Estate bridge on L2
contract PolygonEstateTunnel is FxBaseChildTunnel, IERC721MandatoryTokenReceiver, ERC2771Handler, Ownable, Pausable {
    IEstateToken public childToken;

    event EstateSentToL1(
        uint256 estateId,
        address from,
        address to,
        bytes32 metaData,
        TileWithCoordLib.TileWithCoord[] tiles
    );
    event EstateReceivedFromL1(uint256 estateId, address to, bytes32 metaData, TileWithCoordLib.TileWithCoord[] tiles);

    constructor(
        address _fxChild,
        IEstateToken _childToken,
        address _trustedForwarder
    ) FxBaseChildTunnel(_fxChild) {
        childToken = _childToken;
        __ERC2771Handler_initialize(_trustedForwarder);
    }

    function sendEstateToL1(address to, uint256 estateId) external whenNotPaused() {
        require(to != address(0), "PolygonEstateTunnel: wrong address");
        (bytes32 metaData, TileWithCoordLib.TileWithCoord[] memory tiles) =
            childToken.burnEstate(_msgSender(), estateId);
        _sendMessageToRoot(abi.encode(to, metaData, tiles));
        emit EstateSentToL1(estateId, _msgSender(), to, metaData, tiles);
    }

    /// @dev Change the address of the trusted forwarder for meta-TX
    /// @param trustedForwarder The new trustedForwarder
    function setTrustedForwarder(address trustedForwarder) external onlyOwner {
        _trustedForwarder = trustedForwarder;
    }

    function setChildToken(IEstateToken _childToken) external onlyOwner {
        childToken = _childToken;
    }

    function setRootTunnel(address _fxRootTunnel) external onlyOwner {
        fxRootTunnel = _fxRootTunnel;
    }

    function setChildTunnel(address _fxChild) external onlyOwner {
        fxChild = _fxChild;
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
        (address to, bytes32 metaData, TileWithCoordLib.TileWithCoord[] memory tiles) =
            abi.decode(data, (address, bytes32, TileWithCoordLib.TileWithCoord[]));
        uint256 estateId = childToken.mintEstate(to, metaData, tiles);
        emit EstateReceivedFromL1(estateId, to, metaData, tiles);
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
