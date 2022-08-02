/* solhint-disable no-empty-blocks */
// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "./PolygonAssetERC1155Tunnel.sol";

contract MockPolygonAssetERC1155Tunnel is PolygonAssetERC1155Tunnel {
    constructor(
        address _fxChild,
        IPolygonAssetERC1155 _childToken,
        address _trustedForwarder,
        uint256 _maxTransferLimit
    ) PolygonAssetERC1155Tunnel(_fxChild, _childToken, _trustedForwarder, _maxTransferLimit) {}
}
