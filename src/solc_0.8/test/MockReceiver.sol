//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "../common/interfaces/IERC677Receiver.sol";
import "../common/interfaces/IERC1155TokenReceiver.sol";
import "../common/interfaces/IERC721TokenReceiver.sol";
import "../common/interfaces/IERC165.sol";
import "../common/interfaces/IERC721MandatoryTokenReceiver.sol";

contract MockReceiver is
    IERC677Receiver,
    IERC721TokenReceiver,
    IERC1155TokenReceiver,
    IERC721MandatoryTokenReceiver,
    IERC165
{
    event ReceivedId(address indexed operator, address indexed sender, uint256 id, bytes data);
    event ReceivedIdAndValue(address indexed operator, address indexed sender, uint256 id, uint256 value, bytes data);
    event ReceivedIds(address indexed operator, address indexed sender, uint256[] ids, bytes data);
    event ReceivedIdsAndValues(
        address indexed operator,
        address indexed sender,
        uint256[] ids,
        uint256[] values,
        bytes data
    );

    function onTokenTransfer(
        address _sender,
        uint256 _value,
        bytes calldata _data
    ) external override {
        emit ReceivedId(address(0), _sender, _value, _data);
    }

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external override(IERC721MandatoryTokenReceiver, IERC721TokenReceiver) returns (bytes4) {
        emit ReceivedId(operator, from, tokenId, data);
        return this.onERC721Received.selector;
    }

    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external override returns (bytes4) {
        emit ReceivedIdAndValue(operator, from, id, value, data);
        return this.onERC1155Received.selector;
    }

    function onERC721BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        bytes calldata data
    ) external override returns (bytes4) {
        emit ReceivedIds(operator, from, ids, data);
        return this.onERC721BatchReceived.selector;
    }

    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external override returns (bytes4) {
        emit ReceivedIdsAndValues(operator, from, ids, values, data);
        return this.onERC1155BatchReceived.selector;
    }

    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return
            interfaceId == type(IERC677Receiver).interfaceId ||
            interfaceId == type(IERC721TokenReceiver).interfaceId ||
            interfaceId == type(IERC1155TokenReceiver).interfaceId ||
            interfaceId == type(IERC721MandatoryTokenReceiver).interfaceId ||
            interfaceId == type(IERC165).interfaceId;
    }
}
