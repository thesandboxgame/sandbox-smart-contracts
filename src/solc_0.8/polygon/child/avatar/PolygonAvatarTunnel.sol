// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {FxBaseChildTunnel} from "fx-portal/contracts/tunnel/FxBaseChildTunnel.sol";
import {IERC721Receiver} from "@openzeppelin/contracts-0.8/token/ERC721/IERC721Receiver.sol";
import {IERC165} from "@openzeppelin/contracts-0.8/interfaces/IERC165.sol";
import {IERC721} from "@openzeppelin/contracts-0.8/token/ERC721/IERC721.sol";
import {Ownable} from "@openzeppelin/contracts-0.8/access/Ownable.sol";
import {Context} from "@openzeppelin/contracts-0.8/utils/Context.sol";
import {ERC2771Handler} from "../../../common/BaseWithStorage/ERC2771Handler.sol";
import {IERC721MandatoryTokenReceiver} from "../../../common/interfaces/IERC721MandatoryTokenReceiver.sol";

/// @title Avatar Polygon matic-fx bridge on L2
contract PolygonAvatarTunnel is FxBaseChildTunnel, IERC721MandatoryTokenReceiver, ERC2771Handler, Ownable {
    IERC721 public childAvatarToken;

    event AvatarReceivedFromL1(
        IERC721 indexed childAvatarToken,
        address indexed depositor,
        address indexed to,
        uint256 id
    );
    event AvatarSentToL1(
        IERC721 indexed childAvatarToken,
        address indexed depositor,
        address indexed userAddress,
        uint256 id
    );

    constructor(
        address _fxChild,
        IERC721 _childAvatarToken,
        address _trustedForwarder
    ) FxBaseChildTunnel(_fxChild) {
        __ERC2771Handler_initialize(_trustedForwarder);
        childAvatarToken = _childAvatarToken;
    }

    /**
     * @dev send token to L1, messages emitted by this contract are proved to the root tunnel.
     * @param to user that will receive the avatar on L1
     * @param tokenId id of the token that will be send
     */
    function sendAvatarToL1(address to, uint256 tokenId) external {
        require(to != address(0), "PolygonAvatarTunnel: INVALID_USER");
        childAvatarToken.safeTransferFrom(_msgSender(), address(this), tokenId);
        _sendMessageToRoot(abi.encode(_msgSender(), to, tokenId));
        emit AvatarSentToL1(childAvatarToken, _msgSender(), to, tokenId);
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
        return
            interfaceId == type(IERC165).interfaceId ||
            interfaceId == type(IERC721Receiver).interfaceId ||
            interfaceId == type(IERC721MandatoryTokenReceiver).interfaceId;
    }

    /// @dev Change the address of the trusted forwarder for meta-TX
    /// @param trustedForwarder The new trustedForwarder
    function setTrustedForwarder(address trustedForwarder) external onlyOwner {
        _trustedForwarder = trustedForwarder;
    }

    /// @dev Change the address of the child avatar token contract
    function setChildAvatarToken(IERC721 _childAvatarToken) external onlyOwner {
        childAvatarToken = _childAvatarToken;
    }

    /// @dev set the fxRootTunnel address
    /// @dev we cannot override setFxRootTunnel, we must wait for the latest matic-fx release
    function setRootTunnel(address _fxRootTunnel) external onlyOwner {
        fxRootTunnel = _fxRootTunnel;
    }

    /// @dev get a message from L1, transfer the avatar to the user
    function _processMessageFromRoot(
        uint256, /* stateId */
        address sender, /* AvatarTunel.sol */
        bytes memory syncData
    ) internal override {
        require(fxRootTunnel != address(0), "PolygonAvatarTunnel: fxRootTunnel must be set");
        require(sender == fxRootTunnel, "PolygonAvatarTunnel: INVALID_SENDER_FROM_ROOT");
        (address depositor, address to, uint256 tokenId) = abi.decode(syncData, (address, address, uint256));
        childAvatarToken.safeTransferFrom(address(this), to, tokenId);
        emit AvatarReceivedFromL1(childAvatarToken, depositor, to, tokenId);
    }

    function _msgSender() internal view override(Context, ERC2771Handler) returns (address sender) {
        return ERC2771Handler._msgSender();
    }

    function _msgData() internal view override(Context, ERC2771Handler) returns (bytes calldata) {
        return ERC2771Handler._msgData();
    }
}
