// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "../FxTunnelBase.sol";

/// @title LAND bridge on L1
contract LandTunnel is FxTunnelBase {
    event Deposit(address user, uint256 size, uint256 x, uint256 y, bytes data);
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

    function batchTransferQuadToL2(
        address to,
        uint256[] memory sizes,
        uint256[] memory xs,
        uint256[] memory ys,
        bytes memory data
    ) public whenNotPaused() {
        require(sizes.length == xs.length && xs.length == ys.length, "l2: invalid data");
        ILandToken(rootToken).batchTransferQuad(_msgSender(), address(this), sizes, xs, ys, data);

        for (uint256 index = 0; index < sizes.length; index++) {
            bytes memory message = abi.encode(to, sizes[index], xs[index], ys[index], data);
            _sendMessageToChild(message);
            emit Deposit(to, sizes[index], xs[index], ys[index], data);
        }
    }

    function _processMessageFromChild(bytes memory message) internal override {
        (address to, uint256[] memory size, uint256[] memory x, uint256[] memory y, bytes memory data) =
            abi.decode(message, (address, uint256[], uint256[], uint256[], bytes));
        for (uint256 index = 0; index < x.length; index++) {
            ILandToken(rootToken).transferQuad(address(this), to, size[index], x[index], y[index], data);
            emit Withdraw(to, size[index], x[index], y[index], data);
        }
    }
}
