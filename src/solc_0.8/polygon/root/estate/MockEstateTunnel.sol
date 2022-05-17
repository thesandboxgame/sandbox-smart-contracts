// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "./EstateTunnel.sol";
import "hardhat/console.sol";

contract MockEstateTunnel is EstateTunnel {
    constructor(
        address _checkpointManager,
        address _fxRoot,
        address _rootToken,
        address _trustedForwarder
    ) EstateTunnel(_checkpointManager, _fxRoot, _rootToken, _trustedForwarder) {
        checkpointManager = ICheckpointManager(_checkpointManager);
        fxRoot = IFxStateSender(_fxRoot);
    }

    function receiveMessage(bytes memory message) public virtual override {
        _processMessageFromChild(message);
    }

    function getMessage(address to, uint256 estateId) public view returns (bytes memory) {
        (bytes32 metadata, TileWithCoordLib.TileWithCoord[] memory freeLands) =
            IEstateToken(rootToken).estateData(estateId);
        bytes memory message = abi.encode(to, metadata, freeLands);
        console.log("MESSAGE SIZE:", message.length);
        return message;
    }
}
