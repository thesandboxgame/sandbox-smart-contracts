pragma solidity 0.5.9;

contract TestERC1155Receiver {
    bool private allowTokensReceived;
    bool private returnCorrectBytes;
    bool private allowBatchTokensReceived;
    bool private returnCorrectBytesOnBatch;

    address private owner;
    address private tokenContract;
    mapping(uint256 => bool) private tokens;

    bytes4 private constant ERC1155_REJECTED = 0xafed434d; // TODO use it
    bytes4 private constant ERC1155_RECEIVED = 0xf23a6e61;
    bytes4 private constant ERC1155_BATCH_RECEIVED = 0xbc197c81;

    constructor(
        address _tokenContract,
        bool _allowTokensReceived,
        bool _returnCorrectBytes,
        bool _allowBatchTokensReceived,
        bool _returnCorrectBytesOnBatch
    ) public {
        tokenContract = _tokenContract;
        allowTokensReceived = _allowTokensReceived;
        returnCorrectBytes = _returnCorrectBytes;
        allowBatchTokensReceived = _allowBatchTokensReceived;
        returnCorrectBytesOnBatch = _returnCorrectBytesOnBatch;

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
        require(allowTokensReceived, "Receive not allowed");
        if (returnCorrectBytes) {
            return ERC1155_RECEIVED;
        } else {
            return 0x150b7a03;
        }
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
