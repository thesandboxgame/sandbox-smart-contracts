pragma solidity 0.5.9;

contract TestERC1155ERC721TokenReceiver {
    bool private allowTokensReceived;
    bool private returnCorrectBytes;
    bool private allowBatchTokensReceived;
    bool private returnCorrectBytesOnBatch;
    bool private doNotThrow;

    address private owner;
    address private tokenContract;
    mapping(uint256 => bool) private tokens;

    bytes4 private constant ERC1155_IS_RECEIVER = 0x0d912442;
    bytes4 private constant ERC1155_RECEIVED = 0xf23a6e61;
    bytes4 private constant ERC1155_BATCH_RECEIVED = 0xbc197c81;
    bytes4 private constant _ERC721_RECEIVED = 0x150b7a02;

    constructor(
        address _tokenContract,
        bool _allowTokensReceived,
        bool _returnCorrectBytes,
        bool _allowBatchTokensReceived,
        bool _returnCorrectBytesOnBatch,
        bool _doNotThrow
    ) public {
        tokenContract = _tokenContract;
        allowTokensReceived = _allowTokensReceived;
        returnCorrectBytes = _returnCorrectBytes;
        allowBatchTokensReceived = _allowBatchTokensReceived;
        returnCorrectBytesOnBatch = _returnCorrectBytesOnBatch;
        doNotThrow = _doNotThrow;
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner allowed");
        _;
    }

    function onERC1155Received(
        address _operator,
        address _from,
        uint256 _id,
        uint256 _value,
        bytes calldata _data
    ) external returns (bytes4) {
        require(
            address(tokenContract) == msg.sender,
            "only accept tokenContract as sender"
        );
        require(doNotThrow, "throw requested");
        if (!allowTokensReceived) {
            return 0x150b7a03;
        }

        if (returnCorrectBytes) {
            (bool success, bytes memory returnData) = tokenContract.call(
                abi.encodeWithSignature("ownerOf(uint256)", _id)
            );
            uint256 value;
            assembly {
                value := mload(add(returnData, 32))
            }
            if (success && value == uint256(address(this))) {
                onERC721Received(_operator, _from, _id, _data);
            }
            return ERC1155_RECEIVED;
        } else {
            return 0x150b7a03;
        }
    }

    function supportsInterface(bytes4 _interfaceId)
        external
        pure
        returns (bool)
    {
        return _interfaceId == 0x01ffc9a7 || _interfaceId == 0x4e2312e0;
    }

    function onERC1155BatchReceived(
        address _operator,
        address _from,
        uint256[] calldata _ids,
        uint256[] calldata _values,
        bytes calldata _data
    ) external returns (bytes4) {
        require(
            address(tokenContract) == msg.sender,
            "only accept tokenContract as sender"
        );
        require(allowBatchTokensReceived, "Receive not allowed");
        if (returnCorrectBytesOnBatch) {
            return ERC1155_BATCH_RECEIVED;
        } else {
            return 0x150b7a03;
        }
    }

    function onERC721Received(
        address, // operator,
        address, // from,
        uint256 _tokenId,
        bytes memory // data
    ) public returns (bytes4) {
        require(
            address(tokenContract) == msg.sender,
            "only accept tokenContract as sender"
        );
        require(allowTokensReceived, "Receive not allowed");
        if (returnCorrectBytes) {
            return _ERC721_RECEIVED;
        } else {
            return 0x150b7a03;
        }
    }

    function acceptTokens() public onlyOwner {
        allowTokensReceived = true;
    }
    function rejectTokens() public onlyOwner {
        allowTokensReceived = false;
    }

    function acceptBatchTokens() public onlyOwner {
        allowBatchTokensReceived = true;
    }
    function rejectBatchTokens() public onlyOwner {
        allowBatchTokensReceived = false;
    }
}
