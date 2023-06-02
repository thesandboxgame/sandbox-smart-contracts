// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {FxBaseChildTunnelUpgradeable} from "../../../common/fx-portal/FxBaseChildTunnelUpgradeable.sol";
import {
    OwnableUpgradeable,
    ContextUpgradeable
} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import {IPolygonLandV2} from "../../../common/interfaces/IPolygonLandV2.sol";
import {IERC721MandatoryTokenReceiver} from "../../../common/interfaces/IERC721MandatoryTokenReceiver.sol";
import {ERC2771Handler} from "../../../common/BaseWithStorage/ERC2771Handler.sol";

/**
 * @title PolygonLandTunnelV2
 * @author The Sandbox
 * @notice LAND tunnel on the child chain
 */
contract PolygonLandTunnelV2 is
    FxBaseChildTunnelUpgradeable,
    IERC721MandatoryTokenReceiver,
    ERC2771Handler,
    OwnableUpgradeable,
    PausableUpgradeable
{
    bool internal transferringToL1;
    uint32 public maxGasLimitOnL1;
    uint256 public maxAllowedLands;
    IPolygonLandV2 public childToken;

    mapping(uint8 => uint32) public gasLimits;

    event SetGasLimit(uint8 indexed size, uint32 indexed limit);
    event SetMaxGasLimit(uint32 maxGasLimit);
    event SetMaxAllowedLands(uint256 maxLands);
    event Deposit(address indexed user, uint256 size, uint256 x, uint256 y, bytes data);
    event Withdraw(address indexed user, uint256 size, uint256 x, uint256 y, bytes data);

    /// @notice initialize the contract
    /// @param _fxChild child contract for state receiver
    /// @param _childToken address of the token on the child chain
    /// @param _trustedForwarder address of an ERC2771 meta transaction sender contract
    /// @param _maxGasLimit maximum accepted gas limit
    /// @param _maxAllowedLands maximum number of Lands accepted
    /// @param limits the estimated gas that the L1 tx will use per quad size
    function initialize(
        address _fxChild,
        IPolygonLandV2 _childToken,
        address _trustedForwarder,
        uint32 _maxGasLimit,
        uint256 _maxAllowedLands,
        uint32[5] memory limits
    ) public initializer {
        __Ownable_init();
        __Pausable_init();
        childToken = _childToken;
        _setMaxLimitOnL1(_maxGasLimit);
        _setMaxAllowedLands(_maxAllowedLands);
        setupGasLimits(limits);
        __FxBaseChildTunnelUpgradeable_initialize(_fxChild);
        __ERC2771Handler_initialize(_trustedForwarder);
    }

    /// @notice set the limit of lands we can send in one tx to L1
    /// @param _maxAllowedLands maximum number of lands accepted
    function setMaxAllowedLands(uint256 _maxAllowedLands) external onlyOwner {
        require(_maxAllowedLands > 0, "PolygonLandTunnelV2: max allowed value cannot be zero");
        maxAllowedLands = _maxAllowedLands;
        emit SetMaxAllowedLands(_maxAllowedLands);
    }

    /// @notice set the estimate of gas that the L1 transaction will use per quad size
    /// @param  size the size of the quad
    /// @param  limit the estimated gas that the L1 tx will use
    function setGasLimit(uint8 size, uint32 limit) external onlyOwner {
        require(size == 1 || size == 3 || size == 6 || size == 12 || size == 24, "PolygonLandTunnelV2: invalid data");

        _setGasLimit(size, limit);
    }

    /// @notice set the estimate of gas that the L1 transaction will use per quad size
    /// @param  limits the estimated gas that the L1 tx will use per quad size
    function setupGasLimits(uint32[5] memory limits) public onlyOwner {
        _setGasLimit(1, limits[0]);
        _setGasLimit(3, limits[1]);
        _setGasLimit(6, limits[2]);
        _setGasLimit(12, limits[3]);
        _setGasLimit(24, limits[4]);
    }

    /// @notice send a batch of quads to L1
    /// @param  to address of the receiver on L1
    /// @param  sizes sizes of quad
    /// @param  xs x coordinates of quads
    /// @param  ys y coordinates of quads
    /// @param  data data send to the receiver onERC721BatchReceived on L1
    function batchTransferQuadToL1(
        address to,
        uint256[] calldata sizes,
        uint256[] calldata xs,
        uint256[] calldata ys,
        bytes memory data
    ) external whenNotPaused() {
        require(to != address(0), "PolygonLandTunnelV2: can't send to zero address");
        require(sizes.length == xs.length, "PolygonLandTunnelV2: sizes's and x's length are different");
        require(sizes.length == ys.length, "PolygonLandTunnelV2: x's and y's length are different");

        uint32 totalGasLimit = 0;
        uint256 lands = 0;
        for (uint256 i = 0; i < sizes.length; i++) {
            totalGasLimit += gasLimits[uint8(sizes[i])];
            lands += sizes[i] * sizes[i];
        }

        require(lands <= maxAllowedLands, "PolygonLandTunnelV2: Exceeds max allowed lands.");
        require(totalGasLimit < maxGasLimitOnL1, "PolygonLandTunnelV2: Exceeds gas limit on L1.");
        transferringToL1 = true;
        for (uint256 i = 0; i < sizes.length; i++) {
            childToken.transferQuad(_msgSender(), address(this), sizes[i], xs[i], ys[i], data);
            emit Withdraw(to, sizes[i], xs[i], ys[i], data);
        }
        _sendMessageToRoot(abi.encode(to, sizes, xs, ys, data));
        transferringToL1 = false;
    }

    /// @notice sets the fx-root tunnel
    /// @dev only owner can call this funtion
    /// @param _fxRootTunnel address of the fx-root tunnel
    function setFxRootTunnel(address _fxRootTunnel) external override onlyOwner {
        require(fxRootTunnel == address(0), "PolygonLandTunnelV2: ROOT_TUNNEL_ALREADY_SET");

        fxRootTunnel = _fxRootTunnel;
    }

    /// @dev Change the address of the trusted forwarder for meta-TX
    /// @param trustedForwarder The new trustedForwarder
    function setTrustedForwarder(address trustedForwarder) external onlyOwner {
        _trustedForwarder = trustedForwarder;

        emit TrustedForwarderSet(trustedForwarder);
    }

    /// @notice set the limit of estimated gas we accept when sending a batch of quads to L1
    /// @param _maxGasLimit maximum accepted gas limit
    function setMaxLimitOnL1(uint32 _maxGasLimit) external onlyOwner {
        _setMaxLimitOnL1(_maxGasLimit);
    }

    /// @dev Pauses all token transfers across bridge
    function pause() external onlyOwner {
        _pause();
    }

    /// @dev Unpauses all token transfers across bridge
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @dev called on ERC721 transfer to this contract
    /// @param operator address of the one sending the ERC721 Token
    /// @return onERC721Received function selector
    function onERC721Received(
        address operator,
        address,
        uint256,
        bytes calldata
    ) external view override returns (bytes4) {
        require(transferringToL1 || childToken.isSuperOperator(operator), "PolygonLandTunnelV2: !BRIDGING");
        return this.onERC721Received.selector;
    }

    /// @dev called on ERC721 batch transfer to this contract
    /// @param operator address of the one sending the ERC721 Token
    /// @return onERC721BatchReceived function selector
    function onERC721BatchReceived(
        address operator,
        address,
        uint256[] calldata,
        bytes calldata
    ) external view override returns (bytes4) {
        require(transferringToL1 || childToken.isSuperOperator(operator), "PolygonLandTunnelV2: !BRIDGING");
        return this.onERC721BatchReceived.selector;
    }

    /// @dev to be called by external contact to check if this contract supports ERC721 token and batch token receive
    /// @param interfaceId the interface to be checked if supported by the contract
    /// @return 0x5e8bf644 is the interface of IERC721MandatoryTokenReceiver and 0x01ffc9a7 for the Eip 165 supports interface's interface id
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x5e8bf644 || interfaceId == 0x01ffc9a7;
    }

    function _processMessageFromRoot(
        uint256,
        address sender,
        bytes memory data
    ) internal override validateSender(sender) {
        _syncDeposit(data);
    }

    function _setMaxLimitOnL1(uint32 _maxGasLimit) internal {
        maxGasLimitOnL1 = _maxGasLimit;
        emit SetMaxGasLimit(_maxGasLimit);
    }

    function _setMaxAllowedLands(uint256 _maxAllowedLands) internal {
        require(_maxAllowedLands > 0, "PolygonLandTunnelV2: max allowed value cannot be zero");
        maxAllowedLands = _maxAllowedLands;
        emit SetMaxAllowedLands(_maxAllowedLands);
    }

    function _syncDeposit(bytes memory syncData) internal {
        (address to, uint256 size, uint256 x, uint256 y, bytes memory data) =
            abi.decode(syncData, (address, uint256, uint256, uint256, bytes));
        childToken.mintAndTransferQuad(to, size, x, y, data);
        emit Deposit(to, size, x, y, data);
    }

    function _msgSender() internal view override(ContextUpgradeable, ERC2771Handler) returns (address) {
        return ERC2771Handler._msgSender();
    }

    function _msgData() internal view override(ContextUpgradeable, ERC2771Handler) returns (bytes calldata) {
        return ERC2771Handler._msgData();
    }

    function _setGasLimit(uint8 size, uint32 limit) internal {
        gasLimits[size] = limit;
        emit SetGasLimit(size, limit);
    }

    uint256[50] private __gap;
}
