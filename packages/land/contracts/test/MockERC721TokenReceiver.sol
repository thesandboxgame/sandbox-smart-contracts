// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

contract MockERC721TokenReceiver {
    bool public denyTokensReceived;
    bool public returnInvalidBytes;
    bool public denyBatchTokensReceived;
    bool public returnInvalidBytesOnBatch;
    bool public doNotThrow;

    address public owner;
    address public tokenContract;
    mapping(uint256 => bool) public tokens;

    bytes4 public constant _ERC721_RECEIVED = 0x150b7a02;
    bytes4 public constant _ERC721_BATCH_RECEIVED = 0x4b808c46;

    function setTokenContract(address _tokenContract) external {
        tokenContract = _tokenContract;
    }

    function setOwner(address _owner) external {
        owner = _owner;
    }

    function supportsInterface(bytes4 _interfaceId) external pure returns (bool) {
        return _interfaceId == 0x01ffc9a7 || _interfaceId == 0x4e2312e0 || _interfaceId == 0x5e8bf644;
    }

    function onERC721BatchReceived(
        address, // operator,
        address, // from,
        uint256[] calldata, // ids,
        bytes calldata // data
    ) external view returns (bytes4) {
        require(address(tokenContract) == msg.sender, "accept tokenContract only");
        require(!denyBatchTokensReceived, "Batch Receive not allowed");
        if (returnInvalidBytes) {
            return 0x150b7a03;
        }
        return _ERC721_BATCH_RECEIVED;
    }

    function onERC721Received(
        address, // operator,
        address, // from,
        uint256, // _tokenId,
        bytes calldata // data
    ) external view returns (bytes4) {
        require(address(tokenContract) == msg.sender, "accept tokenContract only");
        require(!denyTokensReceived, "Receive not allowed");
        if (returnInvalidBytes) {
            return 0x150b7a03;
        }
        return _ERC721_RECEIVED;
    }

    function acceptTokens() external {
        denyTokensReceived = false;
    }

    function rejectTokens() external {
        denyTokensReceived = true;
    }

    function acceptBatchTokens() external {
        denyBatchTokensReceived = false;
    }

    function rejectBatchTokens() external {
        denyBatchTokensReceived = true;
    }

    function returnRightBytes() external {
        returnInvalidBytes = false;
    }

    function returnWrongBytes() external {
        returnInvalidBytes = true;
    }
}
