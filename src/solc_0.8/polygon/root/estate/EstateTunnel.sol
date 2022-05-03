// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "../FxTunnelBase.sol";
import "../../../common/Libraries/TileWithCoordLib.sol";

interface IEstate {
    function freeLand(uint256 estateId) external view returns (TileWithCoordLib.TileWithCoord[] memory);
}
/// @title Estate bridge on L1
contract EstateTunnel is FxTunnelBase {

    event Deposit(address user, TileWithCoordLib.TileWithCoord[]);
    event Withdraw(address user, uint256 size, uint256 x, uint256 y, bytes data);
    constructor(
        address _checkpointManager,
        address _fxRoot,
        address _rootToken,
        address _trustedForwarder
    ) FxTunnelBase(_checkpointManager, _fxRoot, _rootToken, _trustedForwarder){}

    function transferEstateToL2(address to, uint256 estateId) public whenNotPaused() {
        TileWithCoordLib.TileWithCoord[] memory freeLands = IEstate(rootToken).freeLand(estateId);
        bytes memory message = abi.encode(to, freeLands);
        _sendMessageToChild(message);
        emit Deposit(to, freeLands);
    }

    function _processMessageFromChild(bytes memory message) internal override {
        //        (address to, uint256[] memory size, uint256[] memory x, uint256[] memory y, bytes memory data) =
        //        abi.decode(message, (address, uint256[], uint256[], uint256[], bytes));
        //        for (uint256 index = 0; index < x.length; index++) {
        //            LandToken(rootToken).transferQuad(address(this), to, size[index], x[index], y[index], data);
        //            emit Withdraw(to, size[index], x[index], y[index], data);
        //        }
    }
}
