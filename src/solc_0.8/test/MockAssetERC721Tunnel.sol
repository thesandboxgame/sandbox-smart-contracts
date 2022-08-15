// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "../polygon/root/asset/AssetERC721Tunnel.sol";
import "../common/interfaces/IAssetERC721.sol";

contract MockAssetERC721Tunnel is AssetERC721Tunnel {
    function init(
        address _checkpointManager,
        address _fxRoot,
        IAssetERC721 _rootToken,
        address trustedForwarder,
        uint256 _maxTransferLimit
    ) external {
        AssetERC721Tunnel.initialize(_checkpointManager, _fxRoot, _rootToken, trustedForwarder, _maxTransferLimit);
    }

    function receiveMessage(bytes memory message) public virtual override {
        _processMessageFromChild(message);
    }
}
