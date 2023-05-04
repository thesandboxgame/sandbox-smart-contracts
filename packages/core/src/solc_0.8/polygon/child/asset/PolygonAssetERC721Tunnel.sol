// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "../../../common/fx-portal/FxBaseChildTunnelUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/IERC165Upgradeable.sol";

import "../../../common/interfaces/IPolygonAssetERC721.sol";
import "../../../common/interfaces/IERC721MandatoryTokenReceiver.sol";
import "../../../common/BaseWithStorage/ERC2771Handler.sol";

import "./PolygonAssetERC721.sol";

/// @title ASSETERC721 bridge on L2
contract PolygonAssetERC721Tunnel is
    FxBaseChildTunnelUpgradeable,
    IERC165Upgradeable,
    IERC721MandatoryTokenReceiver,
    ERC2771Handler,
    OwnableUpgradeable,
    PausableUpgradeable
{
    IPolygonAssetERC721 public childToken;
    uint256 public maxTransferLimit;
    bool private fetchingAssets = false;

    event SetTransferLimit(uint256 limit);
    event Deposit(address user, uint256 id, bytes data);
    event Withdraw(address user, uint256 id, bytes data);

    // solhint-disable-next-line no-empty-blocks
    constructor() initializer {}

    function initialize(
        address _fxChild,
        IPolygonAssetERC721 _childToken,
        address _trustedForwarder,
        uint256 _maxTransferLimit
    ) public initializer {
        require(address(_childToken) != address(0), "PolygonAssetERC721Tunnel: _childToken can't be zero");
        childToken = _childToken;
        maxTransferLimit = _maxTransferLimit;
        __Ownable_init();
        __Pausable_init();
        __ERC2771Handler_initialize(_trustedForwarder);
        __FxBaseChildTunnelUpgradeable_initialize(_fxChild);
    }

    function setTransferLimit(uint256 _maxTransferLimit) external onlyOwner {
        require(_maxTransferLimit > 0, "PolygonAssetERC721Tunnel: _maxTransferLimit invalid");
        maxTransferLimit = _maxTransferLimit;
        emit SetTransferLimit(_maxTransferLimit);
    }

    function batchWithdrawToRoot(address to, uint256[] calldata ids) external whenNotPaused {
        require(ids.length < maxTransferLimit, "EXCEEDS_TRANSFER_LIMIT");
        string[] memory uris = new string[](ids.length);
        fetchingAssets = true;
        for (uint256 i = 0; i < ids.length; i++) {
            // lock the child tokens in this contract
            uint256 id = ids[i];
            string memory uniqueUri = childToken.tokenURI(id);
            uris[i] = uniqueUri;
            bytes memory uniqueUriData = abi.encode(uniqueUri);
            childToken.safeTransferFrom(_msgSender(), address(this), ids[i], uniqueUriData);
            emit Withdraw(to, ids[i], uniqueUriData);
        }
        fetchingAssets = false;
        _sendMessageToRoot(abi.encode(to, ids, uris));
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
        bytes memory data /* encoded message from root tunnel */
    ) internal override validateSender(sender) {
        _syncDeposit(data);
    }

    function _syncDeposit(bytes memory syncData) internal {
        (address to, uint256[] memory ids, string[] memory uris) = abi.decode(syncData, (address, uint256[], string[]));
        for (uint256 i = 0; i < ids.length; i++) {
            bytes memory uniqueUriData = abi.encode(uris[i]);
            if (!childToken.exists(ids[i])) childToken.mint(to, ids[i], uniqueUriData);
            else childToken.safeTransferFrom(address(this), to, ids[i], uniqueUriData);
            emit Deposit(to, ids[i], uniqueUriData);
        }
    }

    function _msgSender() internal view override(ContextUpgradeable, ERC2771Handler) returns (address sender) {
        return ERC2771Handler._msgSender();
    }

    function _msgData() internal view override(ContextUpgradeable, ERC2771Handler) returns (bytes calldata) {
        return ERC2771Handler._msgData();
    }

    function onERC721Received(
        address, /* operator */
        address, /* from */
        uint256, /* tokenId */
        bytes calldata /* data */
    ) external view override returns (bytes4) {
        require(fetchingAssets == true, "PolygonAssetERC721Tunnel: can't directly send Assets");
        return this.onERC721Received.selector;
    }

    function onERC721BatchReceived(
        address, /* operator */
        address, /* from */
        uint256[] calldata, /* ids */
        bytes calldata /* data */
    ) external view override returns (bytes4) {
        require(fetchingAssets == true, "PolygonAssetERC721Tunnel: can't directly send Assets");
        return this.onERC721BatchReceived.selector;
    }

    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return interfaceId == 0x5e8bf644 || interfaceId == 0x01ffc9a7;
    }
}
