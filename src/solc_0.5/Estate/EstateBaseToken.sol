pragma solidity 0.5.9;

import "../BaseWithStorage/ERC721BaseToken.sol";
import "../Interfaces/LandToken.sol";
import "../contracts_common/Interfaces/ERC721MandatoryTokenReceiver.sol";

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
        _owners[estateId] = 0; // TODO keep track of it so it can transfer Land back
        _numNFTPerAddress[sender]--;
        emit Transfer(sender, address(0), estateId);
    }

    function transferFromDestroyedEstate(address sender, address to, uint256 num) external {
        _check_authorized(sender, WITHDRAWAL);
        // TODO
        // require(sender != address(this), "from itself");
        // require(sender != address(0), "sender is zero address");
        // require(msg.sender == sender ||
        //     _metaTransactionContracts[msg.sender] ||
        //     _superOperators[msg.sender],
        //     "not _check_authorized");
        // require(sender == _pastOwnerOf(estateId), "only owner can transfer land from destroyed estate");
        // TODO
    }


    // //////////////////////////////////////////////////////////////////////////////////////////////////////

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
            require(msg.sender == sender || _metaTransactionContracts[msg.sender], "not _check_authorized");
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

    function onERC721BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        bytes calldata data
    ) external returns (bytes4) {
        revert("please call add* or createFrom* functions");
    }

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4) {
        revert("please call add* or createFrom* functions");
    }
}
