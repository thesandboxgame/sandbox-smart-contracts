// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {
    OwnableUpgradeable,
    ContextUpgradeable
} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import {FxBaseRootTunnelUpgradeable} from "../../../common/fx-portal/FxBaseRootTunnelUpgradeable.sol";
import {ERC2771Handler} from "../../../common/BaseWithStorage/ERC2771Handler.sol";
import {ILandTokenV2} from "../../../common/interfaces/ILandTokenV2.sol";
import {IERC721MandatoryTokenReceiver} from "../../../common/interfaces/IERC721MandatoryTokenReceiver.sol";

/// @title LandTunnelV2
/// @author The Sandbox
/// @notice LAND tunnel on the root chain
contract LandTunnelV2 is
    FxBaseRootTunnelUpgradeable,
    IERC721MandatoryTokenReceiver,
    ERC2771Handler,
    OwnableUpgradeable,
    PausableUpgradeable
{
    ILandTokenV2 public rootToken;
    bool internal transferringToL2;

    event Deposit(address indexed user, uint256 size, uint256 x, uint256 y, bytes data);
    event Withdraw(address indexed user, uint256 size, uint256 x, uint256 y, bytes data);

    /// @notice Initializes the contract
    /// @param _checkpointManager checkpoint manager address
    /// @param _fxRoot state sender contract
    /// @param _rootToken LAND token on the root chain
    /// @param _trustedForwarder trusted forwarder for meta-tx
    function initialize(
        address _checkpointManager,
        address _fxRoot,
        ILandTokenV2 _rootToken,
        address _trustedForwarder
    ) public initializer {
        rootToken = _rootToken;
        __Ownable_init();
        __Pausable_init();
        __FxBaseRootTunnelUpgradeable_initialize(_checkpointManager, _fxRoot);
        __ERC2771Handler_initialize(_trustedForwarder);
    }

    /// @dev called on ERC721 transfer to this contract
    /// @param operator address of the one sending the ERC721 Token
    /// @return onERC721Received function selector
    function onERC721Received(
        address operator,
        address, /* from */
        uint256, /* tokenId */
        bytes calldata /* data */
    ) external view override returns (bytes4) {
        require(transferringToL2 || rootToken.isSuperOperator(operator), "LandTunnelV2: !BRIDGING");
        return this.onERC721Received.selector;
    }

    /// @dev called on ERC721 batch transfer to this contract
    /// @param operator address of the one sending the ERC721 Token
    /// @return onERC721BatchReceived function selector
    function onERC721BatchReceived(
        address operator,
        address, /* from */
        uint256[] calldata, /* ids */
        bytes calldata /* data */
    ) external view override returns (bytes4) {
        require(transferringToL2 || rootToken.isSuperOperator(operator), "LandTunnelV2: !BRIDGING");
        return this.onERC721BatchReceived.selector;
    }

    /// @dev to be called by external contact to check if this contract supports ERC721 token and batch token receive
    /// @param interfaceId the interface to be checked if supported by the contract
    /// @return 0x5e8bf644 is the interface of IERC721MandatoryTokenReceiver and 0x01ffc9a7 for the Eip 165 supports interface's interface id
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x5e8bf644 || interfaceId == 0x01ffc9a7;
    }

    /// @notice Send a batch of quads to L2
    /// @param  to address of the receiver on L2
    /// @param  sizes sizes of quad
    /// @param  xs x coordinates of quads
    /// @param  ys y coordinates of quads
    /// @param  data data send to the receiver onERC721BatchReceived on L1
    function batchTransferQuadToL2(
        address to,
        uint256[] memory sizes,
        uint256[] memory xs,
        uint256[] memory ys,
        bytes memory data
    ) external whenNotPaused() {
        require(to != address(0), "LandTunnelV2: can't send to zero address");
        require(sizes.length == xs.length, "LandTunnelV2: sizes's and x's length are different");
        require(xs.length == ys.length, "LandTunnelV2: x's and y's length are different");
        transferringToL2 = true;
        rootToken.batchTransferQuad(_msgSender(), address(this), sizes, xs, ys, data);
        transferringToL2 = false;
        for (uint256 index = 0; index < sizes.length; index++) {
            bytes memory message = abi.encode(to, sizes[index], xs[index], ys[index], data);
            _sendMessageToChild(message);
            emit Deposit(to, sizes[index], xs[index], ys[index], data);
        }
    }

    /// @notice sets the fx-child tunnel
    /// @dev only owner can call this funtion
    /// @param _fxChildTunnel address of the fx-child tunnel
    function setFxChildTunnel(address _fxChildTunnel) public override onlyOwner {
        super.setFxChildTunnel(_fxChildTunnel);
    }

    /// @dev Change the address of the trusted forwarder for meta-TX
    /// @param trustedForwarder The new trustedForwarder
    function setTrustedForwarder(address trustedForwarder) external onlyOwner {
        _trustedForwarder = trustedForwarder;

        emit TrustedForwarderSet(trustedForwarder);
    }

    /// @dev Pauses all token transfers across bridge
    function pause() external onlyOwner {
        _pause();
    }

    /// @dev Unpauses all token transfers across bridge
    function unpause() external onlyOwner {
        _unpause();
    }

    function _processMessageFromChild(bytes memory message) internal override {
        (address to, uint256[] memory size, uint256[] memory x, uint256[] memory y, bytes memory data) =
            abi.decode(message, (address, uint256[], uint256[], uint256[], bytes));
        for (uint256 index = 0; index < x.length; index++) {
            rootToken.mintAndTransferQuad(to, size[index], x[index], y[index], data);
            emit Withdraw(to, size[index], x[index], y[index], data);
        }
    }

    function _msgSender() internal view override(ContextUpgradeable, ERC2771Handler) returns (address) {
        return ERC2771Handler._msgSender();
    }

    function _msgData() internal view override(ContextUpgradeable, ERC2771Handler) returns (bytes calldata) {
        return ERC2771Handler._msgData();
    }

    uint256[50] private __gap;
}
