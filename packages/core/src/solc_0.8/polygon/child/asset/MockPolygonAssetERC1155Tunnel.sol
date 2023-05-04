/* solhint-disable no-empty-blocks */
// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "./PolygonAssetERC1155Tunnel.sol";

contract MockPolygonAssetERC1155Tunnel is PolygonAssetERC1155Tunnel {
    function init(
        address _fxChild,
        IPolygonAssetERC1155 _childToken,
        address trustedForwarder,
        uint256 _maxTransferLimit
    ) external {
        PolygonAssetERC1155Tunnel.initialize(_fxChild, _childToken, trustedForwarder, _maxTransferLimit);
    }
}
