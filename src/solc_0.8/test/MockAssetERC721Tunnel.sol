// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "../polygon/root/asset/AssetERC721Tunnel.sol";
import "../common/interfaces/IAssetERC721.sol";

contract MockAssetERC721Tunnel is AssetERC721Tunnel {
    constructor(
        address _checkpointManager,
        address _fxRoot,
        IAssetERC721 _rootToken,
        address _trustedForwarder,
        uint256 _maxTransferLimit
    ) AssetERC721Tunnel(_checkpointManager, _fxRoot, _rootToken, _trustedForwarder, _maxTransferLimit) {
        checkpointManager = ICheckpointManager(_checkpointManager);
        fxRoot = IFxStateSender(_fxRoot);
    }

    function receiveMessage(bytes memory message) public virtual override {
        _processMessageFromChild(message);
    }
}
