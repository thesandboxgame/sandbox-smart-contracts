// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {BaseRootTunnel} from "../BaseRootTunnel.sol";
import {IEstateToken} from "../../../common/interfaces/IEstateToken.sol";
import {TileWithCoordLib} from "../../../common/Libraries/TileWithCoordLib.sol";

/// @title Estate bridge on L1
contract EstateTunnel is BaseRootTunnel {
    event EstateSentToL2(uint256 estateId, address from, address to, TileWithCoordLib.TileWithCoord[] tiles);
    event EstateReceivedFromL2(uint256 estateId, address to, TileWithCoordLib.TileWithCoord[] tiles);

    constructor(
        address _checkpointManager,
        address _fxRoot,
        address _rootToken,
        address _trustedForwarder
    )
        BaseRootTunnel(_checkpointManager, _fxRoot, _rootToken, _trustedForwarder)
    // solhint-disable-next-line no-empty-blocks
    {

    }

    function sendEstateToL2(address to, uint256 estateId) external whenNotPaused() {
        TileWithCoordLib.TileWithCoord[] memory tiles = IEstateToken(rootToken).burnEstate(_msgSender(), estateId);
        _sendMessageToChild(abi.encode(to, tiles));
        emit EstateSentToL2(estateId, _msgSender(), to, tiles);
    }

    function receiveEstateFromL2(bytes memory inputData) external {
        require(fxChildTunnel != address(0), "EstateTunnel: fxChildTunnel must be set");
        bytes memory message = _validateAndExtractMessage(inputData);
        _processMessageFromChild(message);
    }

    function _processMessageFromChild(bytes memory message) internal override {
        (address to, TileWithCoordLib.TileWithCoord[] memory tiles) =
            abi.decode(message, (address, TileWithCoordLib.TileWithCoord[]));
        uint256 estateId = IEstateToken(rootToken).mintEstate(to, tiles);
        emit EstateReceivedFromL2(estateId, to, tiles);
    }
}
