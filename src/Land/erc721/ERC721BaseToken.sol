/* solhint-disable func-order */

pragma solidity 0.5.9;

import "../../../contracts_common/src/Interfaces/ERC721Events.sol";

import "../../Sand.sol";


contract ERC721BaseToken is ERC721Events {
    uint256 private constant SIZE = 408;

    uint256 private constant LAYER = 0xFF00000000000000000000000000000000000000000000000000000000000000;
    uint256 private constant LAYER_1x1 = 0x0000000000000000000000000000000000000000000000000000000000000000;
    uint256 private constant LAYER_3x3 = 0x0100000000000000000000000000000000000000000000000000000000000000;
    uint256 private constant LAYER_6x6 = 0x0200000000000000000000000000000000000000000000000000000000000000;
    uint256 private constant LAYER_12x12 = 0x0300000000000000000000000000000000000000000000000000000000000000;
    uint256 private constant LAYER_24x24 = 0x0400000000000000000000000000000000000000000000000000000000000000;

    mapping (address => uint256) public numNFTPerAddress;
    mapping (uint256 => address) public owners;
    mapping (address => mapping(address => bool)) public operatorsForAll;
    mapping (uint256 => address) public operators;
    mapping (uint256 => string) public metadataURIs;
    Sand public sandContract;

    constructor(address sandAddress) public {
        initERC721BaseToken(sandAddress);
    }

    function initERC721BaseToken(address sandAddress) public {
        sandContract = Sand(sandAddress);
    }

    function _transferFrom(address _from, address _to, uint256 _id) internal {
        require(_to != address(0), "Invalid to address");
        if (_from != msg.sender && msg.sender != address(sandContract)) {
            require(
                operatorsForAll[_from][msg.sender] ||
                    operators[_id] == msg.sender,
                "Operator not approved"
            );
        }

        numNFTPerAddress[_from]--;
        numNFTPerAddress[_to]++;
        owners[_id] = _to;
        operators[_id] = address(0);
        emit Transfer(_from, _to, _id);
    }

    function balanceOf(address _owner) external view returns (
        uint256 _balance
    ) {
        require(_owner != address(0), "zero owner");
        return numNFTPerAddress[_owner];
    }

    function mintBlock(address to, uint8 size, uint16 x, uint16 y) external {
        require(x % size == 0 && y % size == 0, "invalid coordinates");
        require(x < SIZE && y < SIZE, "out of bounds");

        uint256 blockId;
        uint256 id = x + y * SIZE;

        if (size == 1) {
            blockId = id;
        } else if (size == 3) {
            blockId = LAYER_3x3 + id;
        } else if (size == 6) {
            blockId = LAYER_6x6 + id;
        } else if (size == 12) {
            blockId = LAYER_12x12 + id;
        } else if (size == 24) {
            blockId = LAYER_24x24 + id;
        } else {
            require(false, "invalid size");
        }

        for (uint16 xi = x; xi < x+size; xi++) {
            for (uint16 yi = y; yi < y+size; yi++) {
                uint256 id1x1 = xi + yi * SIZE;
                require(_ownerOf(id1x1) == address(0), "already exists");
                emit Transfer(address(0), to, id1x1);
            }
        }

        owners[blockId] = to;
        numNFTPerAddress[to] += size*size;
    }

    function _ownerOf(uint256 _id) internal view returns (address) {
        uint256 x = _id % SIZE;
        uint256 y = _id / SIZE;
        address owner1x1 = owners[_id];

        if (owner1x1 != address(0)) {
            return owner1x1;
        } else {
            address owner3x3 = owners[LAYER_3x3 + x + y * SIZE];
            if (owner3x3 != address(0)) {
                return owner3x3;
            } else {
                address owner6x6 = owners[LAYER_6x6 + x + y * SIZE];
                if (owner6x6 != address(0)) {
                    return owner6x6;
                } else {
                    address owner12x12 = owners[LAYER_12x12 + x + y * SIZE];
                    if (owner12x12 != address(0)) {
                        return owner12x12;
                    } else {
                        return owners[LAYER_24x24 + x + y * SIZE];
                    }
                }
            }
        }
    }

    function ownerOf(uint256 _id) external view returns (address _owner) {
        require(_id & LAYER == 0, "invalid token id");
        _owner = _ownerOf(_id);
        require(_owner != address(0), "does not exist");
    }

    function approveFor(
        address _sender,
        address _operator,
        uint256 _id
    ) external {
        require(_id & LAYER == 0, "invalid token id");
        require(
            msg.sender == _sender || msg.sender == address(sandContract),
            "only msg.sender or sandContract can act on behalf of sender"
        );
        require(_ownerOf(_id) == _sender, "only owner can change operator");

        operators[_id] = _operator;
        emit Approval(_sender, _operator, _id);
    }

    function approve(address _operator, uint256 _id) external {
        require(_id & LAYER == 0, "invalid token id");
        require(_ownerOf(_id) == msg.sender, "only owner can change operator");

        operators[_id] = _operator;
        emit Approval(msg.sender, _operator, _id);
    }

    function getApproved(uint256 _id) external view returns (address _operator) {
        require(_id & LAYER == 0, "invalid token id");
        require(_ownerOf(_id) != address(0), "does not exist");
        return operators[_id];
    }

    function transferFrom(address _from, address _to, uint256 _id) external {
        require(_id & LAYER == 0, "invalid token id");
        address owner = _ownerOf(_id);
        require(owner != address(0), "not an NFT");
        require(owner == _from, "only owner can change operator");
        _transferFrom(_from, _to, _id);
    }

    function transferFrom(address _from, address _to, uint256 _id, bytes calldata _data) external {
        require(_id & LAYER == 0, "invalid token id");
        address owner = _ownerOf(_id);
        require(owner != address(0), "not an NFT");
        require(owner == _from, "only owner can change operator");
        _transferFrom(_from, _to, _id); // TODO _data
    }

    function safeTransferFrom(address _from, address _to, uint256 _id, bytes calldata _data) external {
        require(_id & LAYER == 0, "invalid token id");
        address owner = _ownerOf(_id);
        require(owner != address(0), "not an NFT");
        require(owner == _from, "only owner can change operator");
        _transferFrom(_from, _to, _id); // TODO _data + safe
    }

    function safeTransferFrom(address _from, address _to, uint256 _id) external {
        require(_id & LAYER == 0, "invalid token id");
        address owner = _ownerOf(_id);
        require(owner != address(0), "not an NFT");
        require(owner == _from, "only owner can change operator");
        _transferFrom(_from, _to, _id); // TODO safe
    }

    /////////////////////////////////////////////////////////////////////////////////////////////////////
    function name() external pure returns (string memory _name) {
        return "SANDBOX LAND";
    }

    function symbol() external pure returns (string memory _symbol) {
        return "SLD"; // TODO define symbol
    }

    function tokenURI(uint256 _id) public view returns (string memory) {
        require(_id & LAYER == 0, "invalid token id");
        require(_ownerOf(_id) != address(0));
        return string(metadataURIs[_id]);
    }
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    function supportsInterface(bytes4) external view returns (bool) {
        // TODO _interfaceId)
        return true; // TODO
    }

    // Operators /////////////////////////////////////////////////////////////////////////////////////
    function setApprovalForAllFor(
        address _sender,
        address _operator,
        bool _approved
    ) external {
        require(
            msg.sender == _sender || msg.sender == address(sandContract),
            "only msg.sender or _sandContract can act on behalf of sender"
        );
        _setApprovalForAll(_sender, _operator, _approved);
    }

    function setApprovalForAll(address _operator, bool _approved) external {
        _setApprovalForAll(msg.sender, _operator, _approved);
    }

    function _setApprovalForAll(
        address _sender,
        address _operator,
        bool _approved
    ) internal {
        operatorsForAll[_sender][_operator] = _approved;
        emit ApprovalForAll(_sender, _operator, _approved);
    }

    function isApprovedForAll(address _owner, address _operator)
        external
        view
        returns (bool isOperator)
    {
        return operatorsForAll[_owner][_operator];
    }
}
