// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "fx-portal/contracts/tunnel/FxBaseChildTunnel.sol";
import "../../../common/interfaces/IPolygonLand.sol";
import "../../../common/interfaces/IERC721TokenReceiver.sol";
import "./PolygonLandBaseToken.sol";

// @todo - natspec comments

contract PolygonLandTunnel is FxBaseChildTunnel, IERC721Receiver {
    IPolygonLand public childToken;

    constructor(address _fxChild, IPolygonLand _childToken) FxBaseChildTunnel(_fxChild) {
        childToken = _childToken;
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
