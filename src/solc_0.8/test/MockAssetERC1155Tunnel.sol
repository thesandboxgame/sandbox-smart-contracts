// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "../polygon/root/asset/AssetERC1155Tunnel.sol";

contract MockAssetERC1155Tunnel is AssetERC1155Tunnel {
    constructor(
        address _checkpointManager,
        address _fxRoot,
        IAssetERC1155 _rootToken,
        address _trustedForwarder,
        uint256 _maxTransferLimit
    ) AssetERC1155Tunnel(_checkpointManager, _fxRoot, _rootToken, _trustedForwarder, _maxTransferLimit) {
        checkpointManager = ICheckpointManager(_checkpointManager);
        fxRoot = IFxStateSender(_fxRoot);
    }

    function receiveMessage(bytes memory message) public virtual override {
        _processMessageFromChild(message);
    }
}
