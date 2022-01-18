// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "fx-portal/contracts/tunnel/FxBaseRootTunnel.sol";
import "../../../common/interfaces/ILandToken.sol";
import "../../../common/interfaces/IERC721TokenReceiver.sol";
import "@openzeppelin/contracts-0.8/access/Ownable.sol";

// @todo - natspec comments

contract LandTunnel is FxBaseRootTunnel, IERC721TokenReceiver, Ownable {
    address public rootToken;
    uint32 public maxGasLimitOnL2 = 500;
    mapping(uint8 => uint32) public gasLimits;
    uint256 public maxAllowedQuads = 144;

    event Deposit(address user, uint256 size, uint256 x, uint256 y, bytes data);
    event Withdraw(address user, uint256 size, uint256 x, uint256 y, bytes data);

    event SetGasLimit(uint8 size, uint32 limit);
    event SetMaxGasLimit(uint32 maxGasLimit);
    event SetMaxAllowedQuads(uint256 maxQuads);

    function setMaxLimitOnL2(uint32 _maxGasLimit) external onlyOwner {
        maxGasLimitOnL2 = _maxGasLimit;
        emit SetMaxGasLimit(_maxGasLimit);
    }

    function _setLimit(uint8 size, uint32 limit) internal {
        gasLimits[size] = limit;
        emit SetGasLimit(size, limit);
    }

    function setLimit(uint8 size, uint32 limit) external onlyOwner {
        _setLimit(size, limit);
    }

    function setMaxAllowedQuads(uint256 _maxAllowedQuads) external onlyOwner {
        maxAllowedQuads = _maxAllowedQuads;
        emit SetMaxAllowedQuads(_maxAllowedQuads);
    }

    // setupLimits([5, 10, 20, 90, 340]);
    function setupLimits(uint32[5] calldata limits) external onlyOwner {
        _setLimit(1, limits[0]);
        _setLimit(3, limits[1]);
        _setLimit(6, limits[2]);
        _setLimit(12, limits[3]);
        _setLimit(24, limits[4]);
    }

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

    function batchTransferQuadToL2(
        address to,
        uint256[] memory sizes,
        uint256[] memory xs,
        uint256[] memory ys,
        bytes memory data
    ) public {
        require(sizes.length == xs.length && xs.length == ys.length, "l2: invalid data");
        LandToken(rootToken).batchTransferQuad(msg.sender, address(this), sizes, xs, ys, data);

        uint32 gasLimit = 0;
        uint256 quads = 0;
        for (uint256 i = 0; i < sizes.length; i++) {
            gasLimit += gasLimits[uint8(sizes[i])];
            quads += sizes[i] * sizes[i];
        }

        require(quads <= maxAllowedQuads, "Exceeds max allowed quads.");
        require(gasLimit < maxGasLimitOnL2, "Exceeds gas limit on L2.");

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
            LandToken(rootToken).transferQuad(address(this), to, size[index], x[index], y[index], data);
            emit Withdraw(to, size[index], x[index], y[index], data);
        }
    }
}
