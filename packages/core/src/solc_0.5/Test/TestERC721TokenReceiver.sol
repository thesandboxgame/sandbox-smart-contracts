pragma solidity 0.5.9;

contract TestERC721TokenReceiver {
    bool private allowTokensReceived;
    bool private returnCorrectBytes;

    address private owner;
    address private tokenContract;
    mapping(uint256 => bool) private tokens;

    // Equals to `bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))`
    // which can be also obtained as `IERC721Receiver(0).onERC721Received.selector`
    bytes4 private constant _ERC721_RECEIVED = 0x150b7a02;

    constructor(
        address _tokenContract,
        bool _allowTokensReceived,
        bool _returnCorrectBytes
    ) public {
        tokenContract = _tokenContract;
        allowTokensReceived = _allowTokensReceived;
        returnCorrectBytes = _returnCorrectBytes;
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner allowed");
        _;
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
}
