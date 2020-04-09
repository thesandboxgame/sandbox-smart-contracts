pragma solidity 0.6.4;

import "../BaseWithStorage/ERC721BaseToken.sol";
import "../Interfaces/LandToken.sol";
import "../../contracts_common/src/Interfaces/ERC721MandatoryTokenReceiver.sol";

contract EstateBaseToken is ERC721BaseToken {
    uint16 internal constant GRID_SIZE = 408;

    uint256 _nextId = 1;
    mapping(uint256 => uint24[]) _quadsInEstate;
    LandToken _land;
    address _minter;
    address _breaker;

    event QuadsAdded(uint256 indexed id, uint24[] list);
    event QuadsRemoved(uint256 indexed id, uint256 numRemoved);

    event Minter(address newMinter);
    event Breaker(address newBreaker);

    constructor(
        address metaTransactionContract,
        address admin,
        LandToken land
    ) public ERC721BaseToken(metaTransactionContract, admin) {
        _land = land;
    }

    function setMinter(address minter) external {
        require(msg.sender == _admin, "ADMIN_NOT_AUTHORIZED");
        require(minter != _minter, "MINTER_SAME_ALREADY_SET");
        _minter = minter;
        emit Minter(minter);
    }
    function getMinter() external view returns (address) {
        return _minter;
    }
    function setBreaker(address breaker) external {
        require(msg.sender == _admin, "ADMIN_NOT_AUTHORIZED");
        require(breaker != _breaker, "BREAKER_SAME_ALREADY_SET");
        _breaker = breaker;
        emit Breaker(breaker);
    }
    function getBreaker() external view returns (address) {
        return _breaker;
    }

    function createFromQuad(address sender, address to, uint256 size, uint256 x, uint256 y) external returns (uint256) {
        require(to != address(0), "DESTINATION_ZERO_ADDRESS");
        require(to != address(this), "DESTINATION_ESTATE_CONTRACT");
        _check_create_authorized(sender);
        uint256 estateId = _mintEstate(to);
        _addSingleQuad(sender, estateId, size, x, y, true, 0);
        return estateId;
    }

    function addQuad(address sender, uint256 estateId, uint256 size, uint256 x, uint256 y, uint256 junction) external {
        _check_add_authorized(sender, estateId);
        _addSingleQuad(sender, estateId, size, x, y, false, junction);
    }

    function createFromMultipleLands(
        address sender,
        address to,
        uint256[] calldata ids,
        uint256[] calldata junctions
    ) external returns (uint256) {
        require(to != address(0), "DESTINATION_ZERO_ADDRESS");
        require(to != address(this), "DESTINATION_ESTATE_CONTRACT");
        _check_create_authorized(sender);
        uint256 estateId = _mintEstate(to);
        _addLands(sender, estateId, ids, junctions);
        return estateId;
    }

    function addSingleLand(
        address sender,
        uint256 estateId,
        uint256 id,
        uint256 junction
    ) external {
        _check_add_authorized(sender, estateId); // TODO test estateId == 0
        _addLand(sender, estateId, id, junction);
    }

    function addMultipleLands(
        address sender,
        uint256 estateId,
        uint256[] calldata ids,
        uint256[] calldata junctions
    ) external {
        _check_add_authorized(sender, estateId);
        _addLands(sender, estateId, ids, junctions);
    }

    function createFromMultipleQuads(
        address sender,
        address to,
        uint256[] calldata sizes,
        uint256[] calldata xs,
        uint256[] calldata ys,
        uint256[] calldata junctions
    ) external returns (uint256) {
        require(to != address(0), "DESTINATION_ZERO_ADDRESS");
        require(to != address(this), "DESTINATION_ESTATE_CONTRACT");
        _check_create_authorized(sender);
        uint256 estateId = _mintEstate(to);
        _addQuads(sender, estateId, sizes, xs, ys, junctions);
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
        _check_add_authorized(sender, estateId);
        _addQuads(sender, estateId, sizes, xs, ys, junctions);
    }

    function burn(uint256 id) override external {
        _check_burn_authorized(msg.sender, id);
        _burn(msg.sender, _ownerOf(id), id);
    }

    function burnFrom(address from, uint256 id) override external {
        _check_burn_authorized(from, id);
        _burn(from, _ownerOf(id), id);
    }

    function burnAndTransferFrom(address sender, uint256 estateId, address to) external {
        _check_burn_authorized(sender, estateId);
        _owners[estateId] = (_owners[estateId] & (2**255 - 1)) | 2**160;
        _numNFTPerAddress[sender]--;
        emit Transfer(sender, address(0), estateId);
        transferAllFromDestroyedEstate(sender, estateId, to);
    }

    // Optimized version where the whole list is in memory
    function transferAllFromDestroyedEstate(
        address sender,
        uint256 estateId,
        address to
    ) public {
        require(to != address(0), "DESTINATION_ZERO_ADDRESS");
        require(to != address(this), "DESTINATION_ESTATE_CONTRACT");
        _check_withdrawal_authorized(sender, estateId);
        uint24[] memory list = _quadsInEstate[estateId];
        uint256 num = list.length;
        require(num > 0, "WITHDRAWAL_COMPLETE");
        uint256[] memory sizes = new uint256[](num);
        uint256[] memory xs = new uint256[](num);
        uint256[] memory ys = new uint256[](num);
        for (uint256 i = 0; i < num; i++) {
            (uint16 x, uint16 y, uint8 size) = _decode(list[num - 1 - i]);
            _quadsInEstate[estateId].pop();
            sizes[i] = size;
            xs[i] = x;
            ys[i] = y;
        }
        delete _quadsInEstate[estateId];
        _land.batchTransferQuad(address(this), to, sizes, xs, ys, "");
        emit QuadsRemoved(estateId, num);
    }

    function transferFromDestroyedEstate(
        address sender,
        uint256 estateId,
        uint256 num,
        address to
    ) public {
        require(to != address(0), "DESTINATION_ZERO_ADDRESS");
        require(to != address(this), "DESTINATION_ESTATE_CONTRACT");
        _check_withdrawal_authorized(sender, estateId);
        uint24[] storage list = _quadsInEstate[estateId];
        uint256 numLeft = list.length;
        if (num == 0) {
            num = numLeft;
        }
        require(num > 0, "WITHDRAWAL_COMPLETE");
        require(numLeft >= num, "WITHDRAWAL_OVERFLOW");
        uint256[] memory sizes = new uint256[](num);
        uint256[] memory xs = new uint256[](num);
        uint256[] memory ys = new uint256[](num);
        for (uint256 i = 0; i < num; i++) {
            (uint16 x, uint16 y, uint8 size) = _decode(list[numLeft - 1 - i]);
            list.pop();
            sizes[i] = size;
            xs[i] = x;
            ys[i] = y;
        }
        _land.batchTransferQuad(address(this), to, sizes, xs, ys, "");
        emit QuadsRemoved(estateId, num);
    }


    // //////////////////////////////////////////////////////////////////////////////////////////////////////

    function _withdrawalOwnerOf(uint256 id) internal view returns (address) {
        uint256 data = _owners[id];
        if ((data & 2**160) == 2**160) {
            return address(data);
        }
        return address(0);
    }

    function _check_owner_authorized(address sender, uint256 estateId) internal view {
        require(sender != address(0), "SENDER_ZERO_ADDRESS");
        (address owner, bool operatorEnabled) = _ownerAndOperatorEnabledOf(estateId);
        require(owner == sender, "OWNER_NOT_EQUAL_SENDER");
        require(
            msg.sender == sender ||
            _metaTransactionContracts[msg.sender] ||
            _superOperators[msg.sender] ||
            _operatorsForAll[sender][msg.sender] ||
            (operatorEnabled && _operators[estateId] == msg.sender),
            "NOT_AUHTORIZED"
        );
    }

    function _check_burn_authorized(address sender, uint256 estateId) internal view {
        require(sender != address(0), "SENDER_ZERO_ADDRESS");
        address breaker = _breaker;
        if (breaker == address(0)) {
            _check_owner_authorized(sender, estateId);
        } else {
            require(msg.sender == breaker, "BREAKER_NOT_AUTHORIZED");
        }
    }

    function _check_create_authorized(address sender) internal view {
        require(sender != address(0), "SENDER_ZERO_ADDRESS");
        address minter = _minter;
        if (minter == address(0)) {
            require(msg.sender == sender || _metaTransactionContracts[msg.sender], "CREATE_NOT_AUHTORIZED");
        } else {
            require(msg.sender == minter, "MINTER_NOT_AUTHORIZED");
        }
    }

    function _check_add_authorized(address sender, uint256 estateId) internal view {
        require(sender != address(0), "SENDER_ZERO_ADDRESS");
        address minter = _minter;
        if (minter == address(0)) {
            _check_owner_authorized(sender, estateId);
        } else {
            require(msg.sender == minter, "MINTER_NOT_AUTHORIZED");
        }
    }

    function _check_withdrawal_authorized(address sender, uint256 estateId) internal view {
        require(sender != address(0), "SENDER_ZERO_ADDRESS");
        require(sender == _withdrawalOwnerOf(estateId), "LAST_OWNER_NOT_EQUAL_SENDER");
        require(
            msg.sender == sender ||
            _metaTransactionContracts[msg.sender] ||
            _superOperators[msg.sender] ||
            _operatorsForAll[sender][msg.sender],
            "WITHDRAWAL_NOT_AUHTORIZED"
        );
    }

    // //////////////////////////////////////////////////////////////////////////////////////////////////////////

    function _encode(uint16 x, uint16 y, uint8 size) internal pure returns (uint24) {
        return uint24(size) * uint24(2**18) + (uint24(x) + uint24(y) * GRID_SIZE);
    }

    function _decode(uint24 data) internal pure returns (uint16 x, uint16 y, uint8 size) {
        size = uint8(data / (2**18));
        uint24 xy = data % (2**18);
        y = uint16(xy / GRID_SIZE);
        x = uint16(xy % GRID_SIZE);
    }

    function _mintEstate(address to) internal returns (uint256) {
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
        uint256 y,
        bool justCreated,
        uint256 junction
    ) internal {
        _land.transferQuad(sender, address(this), size, x, y, "");
        uint24[] memory list = new uint24[](1);
        list[0] = _encode(uint16(x),uint16(y),uint8(size));
        if (!justCreated) {
            require(_quadsInEstate[estateId].length > junction, "JUNCTION_NOT_EXISTS");
            (uint16 lastX, uint16 lastY, uint8 lastSize) = _decode(_quadsInEstate[estateId][junction]);
            require(_adjacent(uint16(x), uint16(y), uint8(size), lastX, lastY, lastSize), "JUNCTION_NOT_ADJACENT");
        }
        _quadsInEstate[estateId].push(list[0]);
        emit QuadsAdded(estateId, list);
    }

    function _addQuads(
        address sender,
        uint256 estateId,
        uint256[] memory sizes,
        uint256[] memory xs,
        uint256[] memory ys,
        uint256[] memory junctions
    ) internal {
        _land.batchTransferQuad(sender, address(this), sizes, xs, ys, "");
        uint24[] memory list = new uint24[](sizes.length);
        for (uint256 i = 0; i < list.length; i++) {
            list[i] = _encode(uint16(xs[i]), uint16(ys[i]), uint8(sizes[i]));
        }

        uint256 l = _quadsInEstate[estateId].length;
        _checkAdjacency(estateId, l, list, junctions);

        if (l == 0) {
            _quadsInEstate[estateId] = list;
        } else {
            for (uint256 i = 0; i < list.length; i++) {
                _quadsInEstate[estateId].push(list[i]);
            }
        }
        emit QuadsAdded(estateId, list);
    }

    function _checkAdjacency(uint256 estateId, uint256 l, uint24[] memory list, uint256[] memory junctions) internal {
        uint16 lastX = 0;
        uint16 lastY = 0;
        uint8 lastSize = 0;
        if (l > 0) {
            (lastX, lastY, lastSize) = _decode(_quadsInEstate[estateId][l-1]);
        }
        uint256 j = 0;
        for (uint256 i = 0; i < list.length; i++) {
            (uint16 x, uint16 y, uint8 size) = _decode(list[i]);
            if (lastSize != 0 && !_adjacent(x, y, size, lastX, lastY, lastSize)) {
                require(j < junctions.length, "JUNCTIONS_MISSING");
                uint256 index = junctions[j];
                j++;
                uint24 data;
                if (index >= l) {
                    require(index - l < i, "JUNCTIONS_NOT_PAST");
                    data = list[index - l];
                } else {
                    data = _quadsInEstate[estateId][index];
                }
                (uint16 jx, uint16 jy, uint8 jsize) = _decode(data);
                require(_adjacent(x, y, size, jx, jy, jsize), "JUNCTION_NOT_ADJACENT");
            }
            lastX = x;
            lastY = y;
            lastSize = size;
        }
    }

    function _adjacent(uint16 x1, uint16 y1, uint8 s1, uint16 x2, uint16 y2, uint8 s2) internal pure returns(bool) {
        return (
            (x1 + s1 > x2 && x1 < x2 + s2 && y1 == y2 - s1) ||
            (x1 + s1 > x2 && x1 < x2 + s2 && y1 == y2 + s2) ||
            (x1 == x2 - s1 && y1 + s1 > y2 && y1 < y2 + s2) ||
            (x1 == x2 + s2 && y1 + s1 > y2 && y1 < y2 + s2)
        );
    }

    function _addLands(
        address sender,
        uint256 estateId,
        uint256[] memory ids,
        uint256[] memory junctions
    ) internal {
        _land.batchTransferFrom(sender, address(this), ids, "");
        uint24[] memory list = new uint24[](ids.length);
        for (uint256 i = 0; i < list.length; i++) {
            uint16 x = uint16(ids[i] % GRID_SIZE);
            uint16 y = uint16(ids[i] / GRID_SIZE);
            list[i] = _encode(x, y, 1);
        }

        uint256 l = _quadsInEstate[estateId].length;
        _checkAdjacency(estateId, l, list, junctions);

        if (l == 0) {
            _quadsInEstate[estateId] = list;
        } else {
            for (uint256 i = 0; i < list.length; i++) {
                _quadsInEstate[estateId].push(list[i]);
            }
        }
        emit QuadsAdded(estateId, list);
    }

    function _addLand(
        address sender,
        uint256 estateId,
        uint256 id,
        uint256 junction
    ) internal {
        _land.transferFrom(sender, address(this), id);
        uint24[] memory list = new uint24[](1);
        uint16 x = uint16(id % GRID_SIZE);
        uint16 y = uint16(id / GRID_SIZE);
        list[0] = _encode(x, y, 1);

        require(_quadsInEstate[estateId].length > junction, "JUNCTION_NOT_EXISTENT");
        (uint16 lastX, uint16 lastY, uint8 lastSize) = _decode(_quadsInEstate[estateId][junction]);
        require(_adjacent(x, y, 1, lastX, lastY, lastSize), "JUNCTION_NOT_ADJACENT");
        _quadsInEstate[estateId].push(list[0]);
        emit QuadsAdded(estateId, list);
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
        address to = abi.decode(data, (address));
        require(to != address(0), "DESTINATION_ZERO_ADDRESS");
        require(to != address(this), "DESTINATION_ESTATE_CONTRACT");
        require(from == address(0), "ONLY_MINTING_ALLOWED_NO_TRANSFER");
        uint8 size = 0;
        if (ids.length == 1) {
            revert("SIZE_1X1");
        } else if (ids.length == 9) {
            size = 3;
        } else if (ids.length == 36) {
            size = 6;
        } else if (ids.length == 144) {
            size = 12;
        } else if (ids.length == 576) {
            size = 24;
        } else {
            revert('SIZE_INVALID');
        }
        uint16 x = uint16(ids[0] % GRID_SIZE);
        uint16 y = uint16(ids[0] / GRID_SIZE);
        for (uint256 i = 1; i < ids.length; i++) {
            uint256 id = ids[i];
            require(id == _idInPath(i, size, x, y), "ID_ORDER");
        }
        uint256 estateId = _mintEstate(to);
        uint24[] memory list = new uint24[](1);
        list[0] = _encode(x, y, size);
        _quadsInEstate[estateId].push(list[0]);
        emit QuadsAdded(estateId, list);
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
        revert("ERC721_REJECTED");
    }

    function supportsInterface(bytes4 id) override virtual public pure returns (bool) {
        return super.supportsInterface(id) || id == 0x5e8bf644;
    }
}
