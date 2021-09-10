// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {FxBaseRootTunnel} from "fx-portal/contracts/tunnel/FxBaseRootTunnel.sol";
import {IERC721Receiver} from "@openzeppelin/contracts-0.8/token/ERC721/IERC721Receiver.sol";
import {IERC165} from "@openzeppelin/contracts-0.8/interfaces/IERC165.sol";
import {Ownable} from "@openzeppelin/contracts-0.8/access/Ownable.sol";
import {Context} from "@openzeppelin/contracts-0.8/utils/Context.sol";
import {ERC2771Handler} from "../../../common/BaseWithStorage/ERC2771Handler.sol";
import {IERC721MandatoryTokenReceiver} from "../../../common/interfaces/IERC721MandatoryTokenReceiver.sol";
import {IERC721} from "@openzeppelin/contracts-0.8/token/ERC721/IERC721.sol";
import {IAvatarMinter} from "../../../common/interfaces/IAvatarMinter.sol";

/// @title Avatar Polygon matic-fx bridge on L1
/// @dev on matic-pos terms a mix of RootChainManager + MintableERC721Predicate
contract AvatarTunnel is FxBaseRootTunnel, ERC2771Handler, IERC721MandatoryTokenReceiver, Ownable {
    IERC721 public rootAvatarToken;

    event AvatarReceivedFromL2(
        IERC721 rootAvatarToken,
        address indexed depositor,
        address indexed to,
        bool minted,
        uint256 id
    );
    event AvatarSentToL2(IERC721 rootAvatarToken, address indexed depositor, address indexed to, uint256 id);

    constructor(
        address _checkpointManager,
        address _fxRoot,
        IERC721 _rootAvatarToken,
        address _trustedForwarder
    ) FxBaseRootTunnel(_checkpointManager, _fxRoot) {
        __ERC2771Handler_initialize(_trustedForwarder);
        rootAvatarToken = _rootAvatarToken;
    }

    /**
     * @dev send token to L2, message is sent specifically to fxChildTunnel
     * @dev an event is emitted and detected by the matic POS bridge that calls the tunnel on L2
     * @param to user that will receive the avatar on L2
     * @param tokenId id of the token that will be send
     */
    function sendAvatarToL2(address to, uint256 tokenId) external {
        require(fxChildTunnel != address(0), "AvatarTunnel: fxChildTunnel must be set");
        require(to != address(0), "AvatarTunnel: INVALID_USER");
        // transfer from depositor to this contract
        rootAvatarToken.safeTransferFrom(_msgSender(), address(this), tokenId);
        _sendMessageToChild(abi.encode(_msgSender(), to, tokenId));
        emit AvatarSentToL2(rootAvatarToken, _msgSender(), to, tokenId);
    }

    /**
     * @dev receive token from L2, event must be emitted by fxChildTunnel
     * @param inputData an encoded prove that the token was locked on L2
     */
    function receiveAvatarFromL2(bytes memory inputData) external {
        require(fxChildTunnel != address(0), "AvatarTunnel: fxChildTunnel must be set");
        bytes memory message = _validateAndExtractMessage(inputData);
        _processMessageFromChild(message);
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

    /// @dev Change the address of the root token
    /// @param _rootAvatarToken the address of the avatar token contract
    function setRootAvatarToken(IERC721 _rootAvatarToken) external onlyOwner {
        rootAvatarToken = _rootAvatarToken;
    }

    /// @dev set fxChildTunnel if not set already
    /// @dev we cannot override setFxChildTunnel, we must wait for the latest matic-fx release
    function setChildTunnel(address _fxChildTunnel) external onlyOwner {
        fxChildTunnel = _fxChildTunnel;
    }

    /// @dev get a message from L2, aka transfer if locked or mint into L1
    function _processMessageFromChild(bytes memory message) internal override {
        (address depositor, address to, uint256 tokenId) = abi.decode(message, (address, address, uint256));
        // Transfer or mint
        IAvatarMinter rootAvatarTokenAsMinter = IAvatarMinter(address(rootAvatarToken));
        bool exist = rootAvatarTokenAsMinter.exists(tokenId);
        if (exist) {
            rootAvatarToken.safeTransferFrom(address(this), to, tokenId);
        } else {
            rootAvatarTokenAsMinter.mint(to, tokenId);
        }
        emit AvatarReceivedFromL2(rootAvatarToken, depositor, to, !exist, tokenId);
    }

    function _msgSender() internal view override(Context, ERC2771Handler) returns (address sender) {
        return ERC2771Handler._msgSender();
    }

    function _msgData() internal view override(Context, ERC2771Handler) returns (bytes calldata) {
        return ERC2771Handler._msgData();
    }
}
