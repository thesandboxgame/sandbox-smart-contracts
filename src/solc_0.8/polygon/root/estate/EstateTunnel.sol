// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "../FxTunnelBase.sol";
import "../../../common/interfaces/IEstateToken.sol";
import "../../../common/Libraries/TileWithCoordLib.sol";

/// @title Estate bridge on L1
contract EstateTunnel is FxTunnelBase {
    event Deposit(address user, TileWithCoordLib.TileWithCoord[]);
    event Withdraw(address user, uint256 size, uint256 x, uint256 y, bytes data);

    constructor(
        address _checkpointManager,
        address _fxRoot,
        address _rootToken,
        address _trustedForwarder
    )
        FxTunnelBase(_checkpointManager, _fxRoot, _rootToken, _trustedForwarder)
    // solhint-disable-next-line no-empty-blocks
    {

    }

    function transferEstateToL2(address to, uint256 estateId) external whenNotPaused() {
        TileWithCoordLib.TileWithCoord[] memory freeLands = IEstateToken(rootToken).freeLand(estateId);
        IEstateToken(rootToken).burnEstate(_msgSender(), estateId);
        bytes memory message = abi.encode(to, freeLands);
        _sendMessageToChild(message);
        emit Deposit(to, freeLands);
    }

    function _processMessageFromChild(bytes memory message) internal override {
        (address to, bytes32 metadata, TileWithCoordLib.TileWithCoord[] memory freeLand) =
            abi.decode(message, (address, bytes32, TileWithCoordLib.TileWithCoord[]));
        IEstateToken(rootToken).mintEstate(to, metadata, freeLand);
    }
}
