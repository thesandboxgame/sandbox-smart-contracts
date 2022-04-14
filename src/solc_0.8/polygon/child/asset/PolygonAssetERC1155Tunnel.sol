// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "fx-portal/contracts/tunnel/FxBaseChildTunnel.sol";
import "@openzeppelin/contracts-0.8/access/Ownable.sol";
import "@openzeppelin/contracts-0.8/security/Pausable.sol";
import "../../../common/interfaces/IAssetERC1155.sol";
import "../../common/ERC1155Receiver.sol";
import "../../../common/BaseWithStorage/ERC2771Handler.sol";

import "./PolygonAssetERC1155.sol";

/// @title ASSETERC1155 bridge on L2
contract PolygonAssetERC1155Tunnel is FxBaseChildTunnel, ERC1155Receiver, ERC2771Handler, Ownable, Pausable {
    IAssetERC1155 public childToken;

    // TODO
    // uint256 public maxGasLimitOnL1;
    // uint256 public maxGasLimitOnL2;

    event Deposit(address user, uint256[] id, uint256[] value, bytes data);
    event Withdraw(address user, uint256 id, uint256 value, bytes data);

    constructor(
        address _fxChild,
        IAssetERC1155 _childToken,
        address _trustedForwarder
    ) FxBaseChildTunnel(_fxChild) {
        childToken = _childToken;
        __ERC2771Handler_initialize(_trustedForwarder);
    }

    function batchWithdrawToRoot(
        address to,
        uint256[] calldata ids,
        uint256[] calldata values
    ) external whenNotPaused() {
        require(ids.length > 0, "MISSING_TOKEN_IDS");
        uint256 id = ids[0];
        string memory uri = childToken.tokenURI(id); // Identical token URIs for ERC155
        bytes memory data = abi.encode(uri); // TODO: test
        for (uint256 i = 0; i < ids.length; i++) {
            childToken.safeTransferFrom(_msgSender(), address(this), ids[i], values[i], data);
            emit Withdraw(to, ids[i], values[i], data);
        }
        _sendMessageToRoot(abi.encode(to, ids, values, data));
    }

    /// @dev Change the address of the trusted forwarder for meta-TX
    /// @param trustedForwarder The new trustedForwarder
    function setTrustedForwarder(address trustedForwarder) external onlyOwner {
        _trustedForwarder = trustedForwarder;
    }

    /// @dev Pauses all token transfers across bridge
    function pause() public onlyOwner {
        _pause();
    }

    /// @dev Unpauses all token transfers across bridge
    function unpause() public onlyOwner {
        _unpause();
    }

    function _processMessageFromRoot(
        uint256, /* stateId */
        address sender,
        bytes memory data
    ) internal override validateSender(sender) {
        _syncDeposit(data);
    }

    function _syncDeposit(bytes memory syncData) internal {
        (address to, uint256[] memory ids, uint256[] memory values, bytes memory data) =
            abi.decode(syncData, (address, uint256[], uint256[], bytes));
        uint256 numberOfTokens = ids.length;
        for (uint256 i = 0; i < numberOfTokens; i++) {
            childToken.wasEverMinted(ids[i])
                ? childToken.safeTransferFrom(address(this), to, ids[i], values[i], data)
                : childToken.mint(to, ids[i], values[i], data);
        }
        emit Deposit(to, ids, values, data);
    }

    function _msgSender() internal view override(Context, ERC2771Handler) returns (address sender) {
        return ERC2771Handler._msgSender();
    }

    function _msgData() internal view override(Context, ERC2771Handler) returns (bytes calldata) {
        return ERC2771Handler._msgData();
    }

    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return
            interfaceId == 0x4e2312e0 || // ERC1155Receiver
            interfaceId == 0x01ffc9a7; // ERC165
    }
}
