// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "fx-portal/contracts/tunnel/FxBaseChildTunnel.sol";
import "../../../common/interfaces/IPolygonLand.sol";
import "../../../common/interfaces/IERC721TokenReceiver.sol";
import "./PolygonLandBaseToken.sol";

// @todo - natspec comments

contract PolygonLandTunnel is FxBaseChildTunnel, IERC721Receiver {
    IPolygonLand public childToken;
    uint32 public maxGasLimitOnL1 = 500;
    mapping(uint8 => uint16) public gasLimits;

    function setLimit(uint8 size, uint16 limit) public {
        gasLimits[size] = limit;
    }

    function setupLimits(uint16[5] memory limits) public {
        gasLimits[1] = limits[0];
        gasLimits[3] = limits[1];
        gasLimits[6] = limits[2];
        gasLimits[12] = limits[3];
        gasLimits[24] = limits[4];
    }

    constructor(address _fxChild, IPolygonLand _childToken) FxBaseChildTunnel(_fxChild) {
        childToken = _childToken;
        setupLimits([5, 10, 20, 90, 340]);
    }

    function transferQuadToL1(
        address to,
        uint256 size,
        uint256 x,
        uint256 y,
        bytes memory data
    ) internal {
        childToken.transferQuad(msg.sender, address(this), size, x, y, data);
        _sendMessageToRoot(abi.encode(to, size, x, y, data));
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
        for (uint256 i = 0; i < sizes.length; i++) {
            gasLimit += gasLimits[uint8(sizes[i])];
        }
        require(gasLimit < maxGasLimitOnL1, "Exceeds gas limit on L1.");
        for (uint256 i = 0; i < sizes.length; i++) {
            transferQuadToL1(to, sizes[i], xs[i], ys[i], data);
        }
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
}
