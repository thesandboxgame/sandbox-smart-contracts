// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "../polygon/root/asset/AssetERC1155Tunnel.sol";

contract MockAssetERC1155Tunnel is AssetERC1155Tunnel {
    function init(
        address _checkpointManager,
        address _fxRoot,
        IAssetERC1155 _rootToken,
        address trustedForwarder,
        uint256 _maxTransferLimit
    ) external {
        AssetERC1155Tunnel.initialize(_checkpointManager, _fxRoot, _rootToken, trustedForwarder, _maxTransferLimit);
    }

    function receiveMessage(bytes memory message) public virtual override {
        _processMessageFromChild(message);
    }
}
