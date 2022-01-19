// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "fx-portal/contracts/tunnel/FxBaseChildTunnel.sol";
import "@openzeppelin/contracts-0.8/access/Ownable.sol";

import "../../../common/interfaces/IPolygonLand.sol";
import "../../../common/interfaces/IERC721MandatoryTokenReceiver.sol";
import "./PolygonLandBaseToken.sol";

// @todo - natspec comments

contract PolygonLandTunnel is FxBaseChildTunnel, IERC721MandatoryTokenReceiver, Ownable {
    IPolygonLand public childToken;
    uint32 public maxGasLimitOnL1 = 500;
    uint256 public maxAllowedQuads = 144;
    mapping(uint8 => uint32) public gasLimits;

    event SetGasLimit(uint8 size, uint32 limit);
    event SetMaxGasLimit(uint32 maxGasLimit);
    event SetMaxAllowedQuads(uint256 maxQuads);

    function setMaxLimitOnL1(uint32 _maxGasLimit) external onlyOwner {
        maxGasLimitOnL1 = _maxGasLimit;
        emit SetMaxGasLimit(_maxGasLimit);
    }

    function setMaxAllowedQuads(uint256 _maxAllowedQuads) external onlyOwner {
        maxAllowedQuads = _maxAllowedQuads;
        emit SetMaxAllowedQuads(_maxAllowedQuads);
    }

    function _setLimit(uint8 size, uint32 limit) internal {
        gasLimits[size] = limit;
        emit SetGasLimit(size, limit);
    }

    function setLimit(uint8 size, uint32 limit) external onlyOwner {
        _setLimit(size, limit);
    }

    // setupLimits([5, 10, 20, 90, 340]);
    function setupLimits(uint32[5] calldata limits) external onlyOwner {
        _setLimit(1, limits[0]);
        _setLimit(3, limits[1]);
        _setLimit(6, limits[2]);
        _setLimit(12, limits[3]);
        _setLimit(24, limits[4]);
    }

    constructor(address _fxChild, IPolygonLand _childToken) FxBaseChildTunnel(_fxChild) {
        childToken = _childToken;
    }

    function batchTransferQuadToL1(
        address to,
        uint256[] calldata sizes,
        uint256[] calldata xs,
        uint256[] calldata ys,
        bytes memory data
    ) external {
        require(sizes.length == xs.length && sizes.length == ys.length, "sizes, xs, ys must be same length");

        uint32 gasLimit = 0;
        uint256 quads = 0;
        for (uint256 i = 0; i < sizes.length; i++) {
            gasLimit += gasLimits[uint8(sizes[i])];
            quads += sizes[i] * sizes[i];
        }

        require(quads <= maxAllowedQuads, "Exceeds max allowed quads.");
        require(gasLimit < maxGasLimitOnL1, "Exceeds gas limit on L1.");
        for (uint256 i = 0; i < sizes.length; i++) {
            childToken.transferQuad(msg.sender, address(this), sizes[i], xs[i], ys[i], data);
        }
        _sendMessageToRoot(abi.encode(to, sizes, xs, ys, data));
    }

    function _processMessageFromRoot(
        uint256, /* stateId */
        address sender,
        bytes memory data
    ) internal override validateSender(sender) {
        _syncDeposit(data);
    }

    function _syncDeposit(bytes memory syncData) internal {
        (address to, uint256 size, uint256 x, uint256 y, bytes memory data) =
            abi.decode(syncData, (address, uint256, uint256, uint256, bytes));
        if (!childToken.exists(size, x, y)) childToken.mint(to, size, x, y, data);
        else childToken.transferQuad(address(this), to, size, x, y, data);
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

    function supportsInterface(bytes4 interfaceId) external view returns (bool) {
        return interfaceId == 0x5e8bf644 || interfaceId == 0x01ffc9a7;
    }
}
