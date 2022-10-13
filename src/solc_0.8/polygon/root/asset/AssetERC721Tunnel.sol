// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "../../../common/fx-portal/FxBaseRootTunnelUpgradeable.sol";
import "../../../common/interfaces/IAssetERC721.sol";
import "../../../common/interfaces/IERC721MandatoryTokenReceiver.sol";
import "../../../common/BaseWithStorage/ERC2771/ERC2771HandlerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/IERC165Upgradeable.sol";

/// @title ASSETERC721 bridge on L1
contract AssetERC721Tunnel is
    FxBaseRootTunnelUpgradeable,
    IERC721MandatoryTokenReceiver,
    ERC2771HandlerUpgradeable,
    OwnableUpgradeable,
    PausableUpgradeable,
    IERC165Upgradeable
{
    IAssetERC721 public rootToken;
    uint256 public maxTransferLimit;
    bool private fetchingAssets;
    bytes4 internal constant ERC165ID = 0x01ffc9a7;
    bytes4 internal constant ERC721_MANDATORY_RECEIVER = 0x5e8bf644;

    event SetTransferLimit(uint256 limit);
    event Deposit(address indexed user, uint256 indexed id, bytes data);
    event Withdraw(address indexed user, uint256 indexed id, bytes data);

    // solhint-disable-next-line no-empty-blocks
    constructor() initializer {}

    function initialize(
        address _checkpointManager,
        address _fxRoot,
        IAssetERC721 _rootToken,
        address trustedForwarder,
        uint256 _maxTransferLimit
    ) public initializer {
        require(address(_rootToken) != address(0), "AssetERC721Tunnel: _rootToken can't be zero");
        require(_checkpointManager != address(0), "AssetERC721Tunnel: _checkpointManager can't be zero");
        require(_fxRoot != address(0), "AssetERC721Tunnel: _fxRoot can't be zero");
        require(trustedForwarder != address(0), "AssetERC721Tunnel: trustedForwarder can't be zero");
        require(_maxTransferLimit > 0, "AssetERC721Tunnel: _maxTransferLimit invalid");
        rootToken = _rootToken;
        maxTransferLimit = _maxTransferLimit;
        __Ownable_init();
        __Pausable_init();
        __ERC2771Handler_initialize(trustedForwarder);
        __FxBaseRootTunnelUpgradeable_initialize(_checkpointManager, _fxRoot);
    }

    function setTransferLimit(uint256 _maxTransferLimit) external onlyOwner {
        require(_maxTransferLimit > 0, "AssetERC721Tunnel: _maxTransferLimit invalid");
        maxTransferLimit = _maxTransferLimit;
        emit SetTransferLimit(_maxTransferLimit);
    }

    function onERC721Received(
        address, /* operator */
        address, /* from */
        uint256, /* tokenId */
        bytes calldata /* data */
    ) external view override returns (bytes4) {
        require(fetchingAssets == true, "AssetERC721Tunnel: can't directly send Assets");
        return this.onERC721Received.selector;
    }

    function onERC721BatchReceived(
        address, /* operator */
        address, /* from */
        uint256[] calldata, /* ids */
        bytes calldata /* data */
    ) external view override returns (bytes4) {
        require(fetchingAssets == true, "AssetERC721Tunnel: can't directly send Assets");
        return this.onERC721BatchReceived.selector;
    }

    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return interfaceId == ERC721_MANDATORY_RECEIVER || interfaceId == ERC165ID;
    }

    function batchDepositToChild(address to, uint256[] memory ids) external whenNotPaused {
        require(ids.length <= maxTransferLimit, "EXCEEDS_TRANSFER_LIMIT");
        string[] memory uris = new string[](ids.length);
        fetchingAssets = true;
        for (uint256 i = 0; i < ids.length; i++) {
            // lock the root tokens in this contract
            uint256 id = ids[i];
            string memory uniqueUri = rootToken.tokenURI(id);
            uris[i] = uniqueUri;
            bytes memory uniqueUriData = abi.encode(uniqueUri);
            rootToken.safeTransferFrom(_msgSender(), address(this), ids[i], uniqueUriData);
            emit Deposit(to, ids[i], uniqueUriData);
        }
        fetchingAssets = false;
        _sendMessageToChild(abi.encode(to, ids, uris));
    }

    /// @dev Change the address of the trusted forwarder for meta-TX
    /// @param trustedForwarder The new trustedForwarder
    function setTrustedForwarder(address trustedForwarder) external onlyOwner {
        require(trustedForwarder != address(0), "AssetERC721Tunnel: trustedForwarder can't be zero");
        _trustedForwarder = trustedForwarder;
    }

    /// @dev Pauses all token transfers across bridge
    function pause() external onlyOwner whenNotPaused {
        _pause();
    }

    /// @dev Unpauses all token transfers across bridge
    function unpause() external onlyOwner whenPaused {
        _unpause();
    }

    function _processMessageFromChild(bytes memory message) internal override {
        (address to, uint256[] memory ids, string[] memory uris) = abi.decode(message, (address, uint256[], string[]));
        for (uint256 i = 0; i < ids.length; i++) {
            bytes memory uniqueUriData = abi.encode(uris[i]);
            if (!rootToken.exists(ids[i])) rootToken.mint(to, ids[i], uniqueUriData);
            else rootToken.safeTransferFrom(address(this), to, ids[i], uniqueUriData);
            emit Withdraw(to, ids[i], uniqueUriData);
        }
    }

    function _msgSender()
        internal
        view
        override(ContextUpgradeable, ERC2771HandlerUpgradeable)
        returns (address sender)
    {
        return ERC2771HandlerUpgradeable._msgSender();
    }

    function _msgData() internal view override(ContextUpgradeable, ERC2771HandlerUpgradeable) returns (bytes calldata) {
        return ERC2771HandlerUpgradeable._msgData();
    }
}
