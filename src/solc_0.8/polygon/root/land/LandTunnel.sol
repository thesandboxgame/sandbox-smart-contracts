// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "fx-portal/contracts/tunnel/FxBaseRootTunnel.sol";
import "../../../common/interfaces/ILandToken.sol";
import "../../../common/interfaces/IERC721TokenReceiver.sol";

// @todo - natspec comments

contract LandTunnel is FxBaseRootTunnel, IERC721TokenReceiver {
    address public rootToken;

    event Deposit(address user, uint256 size, uint256 x, uint256 y, bytes data);
    event Withdraw(address user, uint256 size, uint256 x, uint256 y, bytes data);

    constructor(
        address _checkpointManager,
        address _fxRoot,
        address _rootToken
    ) FxBaseRootTunnel(_checkpointManager, _fxRoot) {
        rootToken = _rootToken;
    }

    function onERC721Received(
        address, /* operator */
        address, /* from */
        uint256, /* tokenId */
        bytes calldata /* data */
    ) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }

    function transferQuadToL2(
        address to,
        uint256 size,
        uint256 x,
        uint256 y,
        bytes memory data
    ) public {
        LandToken(rootToken).transferQuad(msg.sender, address(this), size, x, y, data);
        bytes memory message = abi.encode(to, size, x, y, data);
        _sendMessageToChild(message);
        emit Deposit(to, size, x, y, data);
    }

    function _processMessageFromChild(bytes memory message) internal override {
        (address to, uint256 size, uint256 x, uint256 y, bytes memory data) =
            abi.decode(message, (address, uint256, uint256, uint256, bytes));
        LandToken(rootToken).transferQuad(address(this), to, size, x, y, data);
        emit Withdraw(to, size, x, y, data);
    }
}
