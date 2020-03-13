pragma solidity 0.6.4;

import "../BaseWithStorage/ERC721BaseToken.sol";
import "../Interfaces/LandToken.sol";
import "../../contracts_common/src/Interfaces/ERC721MandatoryTokenReceiver.sol";

contract EstateBaseToken is ERC721BaseToken {
    uint8 internal constant OWNER = 0;
    uint8 internal constant ADD = 1;
    uint8 internal constant BREAK = 2;
    uint8 internal constant WITHDRAWAL = 3;

    uint16 internal constant GRID_SIZE = 408;

    uint256 _nextId = 1;
    mapping(uint256 => uint24[]) _quadsInEstate;
    LandToken _land;
    address _minter;
    address _breaker;

    event QuadsAddedInEstate(uint256 indexed id, uint24[] list);

    constructor(
        address metaTransactionContract,
        address admin,
        LandToken land
    ) public ERC721BaseToken(metaTransactionContract, admin) {
        _land = land;
    }

    function createFromQuad(address sender, address to, uint256 size, uint256 x, uint256 y) external returns (uint256) {
        require(to != address(this), "do not accept estate to itself");
        _check_authorized(sender, ADD);
        uint256 estateId = _mintEstate(to);
        _addSingleQuad(sender, estateId, size, x, y);
        return estateId;
    }

    function addQuad(address sender, uint256 estateId, uint256 size, uint256 x, uint256 y) external {
        _check_authorized(sender, ADD);
        _check_hasOwnerRights(sender, estateId);
        _addSingleQuad(sender, estateId, size, x, y);
    }

    function createFromMultipleLands(
        address sender,
        address to,
        uint256[] calldata ids,
        uint256[] calldata junctions
    ) external returns (uint256) {
        require(to != address(this), "do not accept estate to itself");
        _check_authorized(sender, ADD);
        uint256 estateId = _mintEstate(to);
        _addLands(sender, estateId, ids, junctions, true);
        return estateId;
    }

    // TODO addSingleLand

    function addMultipleLands(
        address sender,
        uint256 estateId,
        uint256[] calldata ids,
        uint256[] calldata junctions
    ) external {
        _check_authorized(sender, ADD);
        _check_hasOwnerRights(sender, estateId);
        _addLands(sender, estateId, ids, junctions, false);
    }

    function createFromMultipleQuads(
        address sender,
        address to,
        uint256[] calldata sizes,
        uint256[] calldata xs,
        uint256[] calldata ys,
        uint256[] calldata junctions
    ) external returns (uint256) {
        require(to != address(this), "do not accept estate to itself");
        _check_authorized(sender, ADD);
        uint256 estateId = _mintEstate(to);
        _addQuads(sender, estateId, sizes, xs, ys, junctions, true);
        return estateId;
    }

    function addMultipleQuads(
        address sender,
        uint256 estateId,
        uint256[] calldata sizes,
        uint256[] calldata xs,
        uint256[] calldata ys,
        uint256[] calldata junctions
        ) external {
        _check_authorized(sender, ADD);
        _check_hasOwnerRights(sender, estateId);
        _addQuads(sender, estateId, sizes, xs, ys, junctions, false);
    }

    function destroy(address sender, uint256 estateId) external {
        _check_authorized(sender, BREAK);
        _check_hasOwnerRights(sender, estateId);
        _owners[estateId] = (_owners[estateId] & (2**255 - 1)) | 2**254;
        _numNFTPerAddress[sender]--;
        emit Transfer(sender, address(0), estateId);
    }

    function destroyAndTransfer(address sender, address to, uint256 estateId) external {
        _check_authorized(sender, BREAK);
        _check_hasOwnerRights(sender, estateId);
        _owners[estateId] = (_owners[estateId] & (2**255 - 1)) | 2**254;
        _numNFTPerAddress[sender]--;
        emit Transfer(sender, address(0), estateId);
        transferFromDestroyedEstate(sender, to, estateId, 0);
    }

    function transferFromDestroyedEstate(address sender, address to, uint256 estateId, uint256 num) public {
        _check_authorized(sender, WITHDRAWAL);
        require(sender == _withdrawalOwnerOf(estateId), "only past owner can transfer land from destroyed estate");
        uint24[] memory list = _quadsInEstate[estateId];
        uint256[] memory sizes = new uint256[](num);
        uint256[] memory xs = new uint256[](num);
        uint256[] memory ys = new uint256[](num);
        uint256 numLeft = list.length;
        if (num == 0) {
            num = numLeft;
        }
        require(num > 0, "no more land left");
        require(numLeft >= num, "trying to extract more than there is");
        for (uint256 i = 0; i < num; i++) {
            (uint16 x, uint16 y, uint8 size) = _decode(list[numLeft - 1 - i]);
            _quadsInEstate[estateId].pop();
            sizes[i] = size;
            xs[i] = x;
            ys[i] = y;
        }
        _land.batchTransferQuad(address(this), to, sizes, xs, ys, "");
    }


    // //////////////////////////////////////////////////////////////////////////////////////////////////////

    function _ownerOf(uint256 id) override internal view returns (address) {
        uint256 data = _owners[id];
        if ((data & 2**254) == 2**254) {
            return address(0); // 
        }
        return address(data);
    }

    function _withdrawalOwnerOf(uint256 id) internal view returns (address) {
        uint256 data = _owners[id];
        if ((data & 2**254) == 2**254) {
            return address(data);
        }
        return address(0);
    }

    function _check_authorized(address sender, uint8 action) internal {
        require(sender != address(0), "sender is zero address");
        if (action == ADD) {
            address minter = _minter;
            if (minter == address(0)) {
                require(msg.sender == sender || _metaTransactionContracts[msg.sender], "not _check_authorized");
            } else {
                require(msg.sender == minter, "only minter allowed");
            }
        } else if (action == BREAK) {
            address breaker = _breaker;
            if (breaker == address(0)) {
                require(msg.sender == sender || _metaTransactionContracts[msg.sender], "not _check_authorized");
            } else {
                require(msg.sender == breaker, "only breaker allowed");
            }
        } else {
            require(msg.sender == sender || _metaTransactionContracts[msg.sender] || _superOperators[msg.sender], "not _check_authorized");
        }
    }

    function _check_hasOwnerRights(address sender, uint256 estateId) internal {
        (address owner, bool operatorEnabled) = _ownerAndOperatorEnabledOf(estateId);
        require(owner != address(0), "token does not exist");
        require(owner == sender, "not owner");
        require(
            _superOperators[msg.sender] ||
            _operatorsForAll[sender][msg.sender] ||
            (operatorEnabled && _operators[estateId] == msg.sender),
            "not approved"
        );
    }

    // //////////////////////////////////////////////////////////////////////////////////////////////////////////

    function _encode(uint16 x, uint16 y, uint8 size) internal pure returns (uint24) {
        return uint24(size) * uint24(2**18) + (uint24(x) + uint24(y) * GRID_SIZE);
    }

    function _decode(uint24 data) internal pure returns (uint16 x, uint16 y, uint8 size) {
        size = uint8(data / (2**18));
        y = uint16(data % (2**18) / GRID_SIZE);
        x = uint16(data % GRID_SIZE);
    }

    function _mintEstate(address to) internal returns (uint256) {
        require(to != address(0), "can't send to zero address");
        uint256 estateId = _nextId++;
        _owners[estateId] = uint256(to);
        _numNFTPerAddress[to]++;
        emit Transfer(address(0), to, estateId);
        return estateId;
    }

    function _addSingleQuad(
        address sender,
        uint256 estateId,
        uint256 size,
        uint256 x,
        uint256 y
    ) internal {
        _land.transferQuad(sender, address(this), size, x, y, "");
        uint24[] memory list = new uint24[](1);
        list[0] = _encode(uint16(x),uint16(y),uint8(size));
        // TODO check adjacency
        _quadsInEstate[estateId].push(list[0]);
        emit QuadsAddedInEstate(estateId, list);
    }

    function _addQuads(
        address sender,
        uint256 estateId,
        uint256[] memory sizes,
        uint256[] memory xs,
        uint256[] memory ys,
        uint256[] memory junctions,
        bool justCreated
    ) internal {
        _land.batchTransferQuad(sender, address(this), sizes, xs, ys, "");
        uint24[] memory list = new uint24[](sizes.length);
        for (uint256 i = 0; i < list.length; i++) {
            list[i] = _encode(uint16(xs[i]), uint16(ys[i]), uint8(sizes[i]));
        }
        // TODO check adjacency
        if (justCreated) {
            _quadsInEstate[estateId] = list;
        } else {
            for (uint256 i = 0; i < list.length; i++) {
                _quadsInEstate[estateId].push(list[i]);
            }
        }
        emit QuadsAddedInEstate(estateId, list);
    }

    function _adjacent(uint16 x1, uint16 y1, uint16 x2, uint16 y2) internal pure returns(bool) {
        return (
            (x1 == x2 && y1 == y2 - 1) ||
            (x1 == x2 && y1 == y2 + 1) ||
            (x1 == x2 - 1 && y1 == y2) ||
            (x1 == x2 + 1 && y1 == y2)
        );
    }

    function _adjacent(uint16 x1, uint16 y1, uint16 x2, uint16 y2, uint8 s2) internal pure returns(bool) {
        return (
            (x1 >= x2 && x1 < x2 + s2 && y1 == y2 - 1) ||
            (x1 >= x2 && x1 < x2 + s2 && y1 == y2 + s2) ||
            (x1 == x2 - 1 && y1 >= y2 && y1 < y2 + s2) ||
            (x1 == x2 - s2 && y1 >= y2 && y1 < y2 + s2)
        );
    }

    function _addLands(
        address sender,
        uint256 estateId,
        uint256[] memory ids,
        uint256[] memory junctions,
        bool justCreated
    ) internal {
        _land.batchTransferFrom(sender, address(this), ids, "");
        uint24[] memory list = new uint24[](ids.length);
        for (uint256 i = 0; i < list.length; i++) {
            uint16 x = uint16(ids[i] % GRID_SIZE);
            uint16 y = uint16(ids[i] / GRID_SIZE);
            list[i] = _encode(x, y, 1);
        }

        uint256 l = _quadsInEstate[estateId].length;
        uint16 lastX = 409;
        uint16 lastY = 409;
        if (!justCreated) {
            uint24 d = _quadsInEstate[estateId][l-1];
            lastX = uint16(d % GRID_SIZE);
            lastY = uint16(d % GRID_SIZE);
        }
        uint256 j = 0;
        for (uint256 i = 0; i < list.length; i++) {
            uint16 x = uint16(ids[i] % GRID_SIZE);
            uint16 y = uint16(ids[i] / GRID_SIZE);
            if (lastX != 409 && !_adjacent(x, y, lastX, lastY)) {
                uint256 index = junctions[j];
                j++;
                uint24 data;
                if (index >= l) {
                    require(index -l < j, "junctions need to refers to previously accepted land");
                    data = list[index - l];
                } else {
                    data = _quadsInEstate[estateId][j];
                }
                (uint16 jx, uint16 jy, uint8 jsize) = _decode(data);
                if (jsize == 1) {
                    require(_adjacent(x, y, jx, jy), "need junctions to be adjacent");
                } else {
                    require(_adjacent(x, y, jx, jy, jsize), "need junctions to be adjacent");
                }
            }
            lastX = x;
            lastY = y;
        }
        if (justCreated) {
            _quadsInEstate[estateId] = list;
        } else {
            for (uint256 i = 0; i < list.length; i++) {
                _quadsInEstate[estateId].push(list[i]);
            }
        }
        emit QuadsAddedInEstate(estateId, list);
    }

    // ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    function _idInPath(uint256 i, uint256 size, uint256 x, uint256 y) internal pure returns(uint256) {
        uint256 row = i / size;
        if(row % 2 == 0) { // alow ids to follow a path in a quad
            return (x + (i%size)) + ((y + row) * GRID_SIZE);
        } else {
            return ((x + size) - (1 + i%size)) + ((y + row) * GRID_SIZE);
        }
    }

    function onERC721BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        bytes calldata data
    ) external returns (bytes4) {
        if (operator == address(this)) {
            return _ERC721_BATCH_RECEIVED;
        }
        address to = abi.decode(data, (address)); // TODO get rid of junctions
        require(from == address(0), "only Land minting allowed to mint Estate on transfer");
        uint8 size = 0;
        if (ids.length == 1) {
            revert("do not accept 1x1 lands");
        } else if (ids.length == 9) {
            size = 3;
        } else if (ids.length == 36) {
            size = 6;
        } else if (ids.length == 144) {
            size = 12;
        } else if (ids.length == 576) {
            size = 24;
        } else {
            revert('invalid length, need to be a quad');
        }
        uint16 x = uint16(ids[0] % GRID_SIZE);
        uint16 y = uint16(ids[0] / GRID_SIZE);
        for (uint256 i = 1; i < ids.length; i++) {
            uint256 id = ids[i];
            require(id == _idInPath(i, size, x, y), "invalid id orders, not a valid quad");
        }
        uint256 estateId = _mintEstate(to);
        uint24[] memory list = new uint24[](1);
        list[0] = _encode(x, y, size);
        _quadsInEstate[estateId].push(list[0]);
        emit QuadsAddedInEstate(estateId, list);
        return _ERC721_BATCH_RECEIVED;
    }

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4) {
        if (operator == address(this)) {
            return _ERC721_BATCH_RECEIVED;
        }
        revert("please call add* or createFrom* functions");
    }

    function supportsInterface(bytes4 id) override virtual public pure returns (bool) {
        return super.supportsInterface(id) || id == 0x5e8bf644;
    }
}
