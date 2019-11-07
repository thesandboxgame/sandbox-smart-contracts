/* solhint-disable func-order, code-complexity */
pragma solidity 0.5.9;

import "./ERC721BaseToken.sol";

contract LandBaseToken is ERC721BaseToken {
    // Our grid is 408 x 408 lands
    uint256 internal constant GRID_SIZE = 408;

    uint256 internal constant LAYER =          0xFF00000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_1x1 =      0x0000000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_3x3 =      0x0100000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_6x6 =      0x0200000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_12x12 =    0x0300000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_24x24 =    0x0400000000000000000000000000000000000000000000000000000000000000;

    mapping(address => bool) internal _minters;
    event Minter(address superOperator, bool enabled);

    /// @notice Enable or disable the ability of `minter` to mint tokens
    /// @param minter address that will be given/removed minter right.
    /// @param enabled set whether the minter is enabled or disabled.
    function setMinter(address minter, bool enabled) external {
        require(
            msg.sender == _admin,
            "only admin is allowed to add minters"
        );
        _minters[minter] = enabled;
        emit Minter(minter, enabled);
    }

    /// @notice check whether address `who` is given minter rights.
    /// @param who The address to query.
    /// @return whether the address has minter rights.
    function isMinter(address who) public view returns (bool) {
        return _minters[who];
    }

    constructor(
        address metaTransactionContract,
        address admin
    ) public ERC721BaseToken(metaTransactionContract, admin) {
    }

    function _checkAndTransferOwnershipOnBlock(address from, address to, uint16 size, uint16 x, uint16 y) internal {
        uint256 blockId;
        uint256 topCornerId = x + y * GRID_SIZE;

        if (size == 3) {
            blockId = LAYER_3x3 + topCornerId;
        } else if (size == 6) {
            blockId = LAYER_6x6 + topCornerId;
        } else if (size == 12) {
            blockId = LAYER_12x12 + topCornerId;
        } else if (size == 24) {
            blockId = LAYER_24x24 + topCornerId;
        } else {
            require(false, "Invalid size, not 3|6|12|24");
        }

        require(_owners[blockId] == uint256(from), "not owner of block"); // invalid topCornerId will be rejected here

        uint256 toX = x+size;
        uint256 toY = y+size;

        for (uint16 xi = x; xi < toX; xi++) {
            for (uint16 yi = y; yi < toY; yi++) {
                require(_owners[xi + yi * GRID_SIZE] == 0, "already broken");
            }
        }

        if (size > 3) {
            for (uint16 x3i = x; x3i < toX; x3i += 3) {
                for (uint16 y3i = y; y3i < toY; y3i += 3) {
                    require(_owners[LAYER_3x3 + x3i + y3i * GRID_SIZE] == 0, "already broken");
                }
            }
        }

        if (size > 6) {
            for (uint16 x6i = x; x6i < toX; x6i += 6) {
                for (uint16 y6i = y; y6i < toY; y6i += 6) {
                    require(_owners[LAYER_6x6 + x6i + y6i * GRID_SIZE] == 0, "already broken");
                }
            }
        }

        if (size > 12) {
            for (uint16 x12i = x; x12i < toX; x12i += 12) {
                for (uint16 y12i = y; y12i < toY; y12i += 12) {
                    require(_owners[LAYER_12x12 + x12i + y12i * GRID_SIZE] == 0, "already broken");
                }
            }
        }

        _owners[blockId] = uint256(to);
    }

    function transferFormedBlock(address from, address to, uint16 size, uint16 x, uint16 y) external {
        require(from != address(0), "from is zero address");
        require(to != address(0), "can't send to zero address");
        bool metaTx = msg.sender != from && _metaTransactionContracts[msg.sender];
        if (msg.sender != from && !metaTx) {
            require(
                _superOperators[msg.sender] ||
                _operatorsForAll[from][msg.sender],
                "Operator not approved to transferFormedBlock"
            );
        }
        require(x % size == 0 && y % size == 0, "Invalid coordinates");
        require(x < GRID_SIZE - size && y < GRID_SIZE - size, "Out of bounds");

        _checkAndTransferOwnershipOnBlock(from, to, size, x, y);
        for (uint16 xi = x; xi < x+size; xi++) {
            for (uint16 yi = y; yi < y+size; yi++) {
                uint256 id1x1 = xi + yi * GRID_SIZE;
                _operators[id1x1] = address(0);
                emit Transfer(from, to, id1x1);
            }
        }
        _numNFTPerAddress[from] -= size * size;
        _numNFTPerAddress[to] += size * size;

        if (to.isContract() && _checkInterfaceWith10000Gas(to, ERC721_MANDATORY_RECEIVER)) {
            uint256[] memory ids = new uint256[](size*size);
            for (uint256 i = 0; i < size*size; i++) {
                if(i % 2 == 0) { // alow ids to follow a path
                    ids[i] = (x + (i%size)) + ((y + (i/size)) * GRID_SIZE);
                } else {
                    ids[i] = ((x + size) - (1 + i%size)) + ((y + (i/size)) * GRID_SIZE);
                }
            }
            require(
                _checkOnERC721BatchReceived(metaTx ? from : msg.sender, from, to, ids, ""), // TODO data
                "erc721 batch transfer rejected by to"
            );
        }
    }

    function transferBlock(address from, address to, uint16 size, uint16 x, uint16 y) external {
        require(from != address(0), "from is zero address");
        require(to != address(0), "can't send to zero address");
        bool metaTx = msg.sender != from && _metaTransactionContracts[msg.sender];
        if (msg.sender != from && !metaTx) {
            require(
                _superOperators[msg.sender] ||
                _operatorsForAll[from][msg.sender],
                "Operator not approved to transferBlock"
            );
        }
        _regroup(from, to, size, x, y);
        for (uint16 xi = x; xi < x+size; xi++) {
            for (uint16 yi = y; yi < y+size; yi++) {
                uint256 id1x1 = xi + yi * GRID_SIZE;
                _operators[id1x1] = address(0);
                emit Transfer(from, to, id1x1);
            }
        }
        _numNFTPerAddress[from] -= size * size;
        _numNFTPerAddress[to] += size * size;

        if (to.isContract() && _checkInterfaceWith10000Gas(to, ERC721_MANDATORY_RECEIVER)) {
            uint256[] memory ids = new uint256[](size*size);
            for (uint256 i = 0; i < size*size; i++) {
                if(i % 2 == 0) { // alow ids to follow a path
                    ids[i] = (x + (i%size)) + ((y + (i/size)) * GRID_SIZE);
                } else {
                    ids[i] = ((x + size) - (1 + i%size)) + ((y + (i/size)) * GRID_SIZE);
                }
            }
            require(
                _checkOnERC721BatchReceived(metaTx ? from : msg.sender, from, to, ids, ""), // TODO data
                "erc721 batch transfer rejected by to"
            );
        }
    }

    function regroup(address from, uint16 size, uint16 x, uint16 y) external {
        require(from != address(0), "token does not exist");
        if (msg.sender != from && !_metaTransactionContracts[msg.sender]) {
            require(
                _superOperators[msg.sender] ||
                _operatorsForAll[from][msg.sender],
                "Operator not approved to regroup"
            );
        }
        _regroup(from, from, size, x, y);
    }

    function _checkAndClear(address from, uint256 id) internal returns(bool) {
        uint256 owner = _owners[id];
        if (owner != 0) {
            require(owner == uint256(from), "not owner");
            _owners[id] = 0;
            return true;
        }
        return false;
    }

    function _regroup(address from, address to, uint16 size, uint16 x, uint16 y) internal {
        require(x % size == 0 && y % size == 0, "Invalid coordinates");
        require(x < GRID_SIZE - size && y < GRID_SIZE - size, "Out of bounds");

        if (size == 3) {
            _regroup3x3(from, to, x, y, true);
        } else if (size == 6) {
            _regroup6x6(from, to, x, y, true);
        } else if (size == 12) {
            _regroup12x12(from, to, x, y, true);
        } else if (size == 24) {
            _regroup24x24(from, to, x, y, true);
        } else {
            require(false, "Invalid size");
        }
    }

    function _regroup3x3(address from, address to, uint16 x, uint16 y, bool set) internal returns (bool) {
        uint256 id = x + y * GRID_SIZE;
        uint256 blockId = LAYER_3x3 + id;
        bool ownerOfAtLeastOne = false;
        for (uint16 xi = x; xi < x+3; xi++) {
            for (uint16 yi = y; yi < y+3; yi++) {
                ownerOfAtLeastOne = !_checkAndClear(from, xi + yi * GRID_SIZE) || ownerOfAtLeastOne;
            }
        }
        if(set) {
            require(ownerOfAtLeastOne || _owners[blockId] == uint256(from), "not owner of sub blocks nor block");
            _owners[blockId] = uint256(to);
        }
        return ownerOfAtLeastOne;
    }
    function _regroup6x6(address from, address to,  uint16 x, uint16 y, bool set) internal returns (bool) {
        bool ownerOfAtLeastOne = _regroup3x3(from, to, x, y, false);
        uint256 id = x + y * GRID_SIZE;
        uint256 blockId = LAYER_6x6 + id;
        for (uint16 xi = x; xi < x+6; xi += 3) {
            for (uint16 yi = y; yi < y+6; yi += 3) {
                ownerOfAtLeastOne = !_checkAndClear(from, xi + yi * GRID_SIZE) || ownerOfAtLeastOne;
            }
        }
        if(set) {
            require(ownerOfAtLeastOne || _owners[blockId] == uint256(from), "not owner of sub blocks nor block");
            _owners[blockId] = uint256(to);
        }
        return ownerOfAtLeastOne;
    }
    function _regroup12x12(address from, address to,  uint16 x, uint16 y, bool set) internal returns (bool) {
        bool ownerOfAtLeastOne = _regroup6x6(from, to, x, y, false);
        uint256 id = x + y * GRID_SIZE;
        uint256 blockId = LAYER_12x12 + id;
        for (uint16 xi = x; xi < x+12; xi += 6) {
            for (uint16 yi = y; yi < y+12; yi += 6) {
                ownerOfAtLeastOne = !_checkAndClear(from, xi + yi * GRID_SIZE) || ownerOfAtLeastOne;
            }
        }
        if(set) {
            require(ownerOfAtLeastOne || _owners[blockId] == uint256(from), "not owner of sub blocks nor block");
            _owners[blockId] = uint256(to);
        }
        return ownerOfAtLeastOne;
    }
    function _regroup24x24(address from, address to,  uint16 x, uint16 y, bool set) internal returns (bool) {
        bool ownerOfAtLeastOne = _regroup12x12(from, to, x, y, false);
        uint256 id = x + y * GRID_SIZE;
        uint256 blockId = LAYER_24x24 + id;
        for (uint16 xi = x; xi < x+24; xi += 12) {
            for (uint16 yi = y; yi < y+24; yi += 12) {
                ownerOfAtLeastOne = !_checkAndClear(from, xi + yi * GRID_SIZE) || ownerOfAtLeastOne;
            }
        }
        if(set) {
            require(ownerOfAtLeastOne || _owners[blockId] == uint256(from), "not owner of sub blocks nor block");
            _owners[blockId] = uint256(to);
        }
        return ownerOfAtLeastOne;
    }

    /**
     * @notice Mint a new block
     * @param to The recipient of the new block
     * @param size The size of the new block
     * @param x The x coordinate of the new block
     * @param y The y coordinate of the new block
     */
    function mintBlock(address to, uint16 size, uint16 x, uint16 y) external {
        require(
            isMinter(msg.sender),
            "Only a minter can mint"
        );
        require(x % size == 0 && y % size == 0, "Invalid coordinates");
        require(x < GRID_SIZE - size && y < GRID_SIZE - size, "Out of bounds");

        uint256 blockId;
        uint256 id = x + y * GRID_SIZE;

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
            require(false, "Invalid size");
        }

        require(_owners[LAYER_24x24 + (x/24) * 24 + ((y/24) * 24) * GRID_SIZE] == 0, "Already minted as 24x24");

        uint256 toX = x+size;
        uint256 toY = y+size;
        if (size <= 12) {
            require(
                _owners[LAYER_12x12 + (x/12) * 12 + ((y/12) * 12) * GRID_SIZE] == 0,
                "Already minted as 12x12"
            );
        } else {
            for (uint16 x12i = x; x12i < toX; x12i += 12) {
                for (uint16 y12i = y; y12i < toY; y12i += 12) {
                    uint256 id12x12 = LAYER_12x12 + x12i + y12i * GRID_SIZE;
                    require(_owners[id12x12] == 0, "Already minted as 12x12");
                }
            }
        }

        if (size <= 6) {
            require(_owners[LAYER_6x6 + (x/6) * 6 + ((y/6) * 6) * GRID_SIZE] == 0, "Already minted as 6x6");
        } else {
            for (uint16 x6i = x; x6i < toX; x6i += 6) {
                for (uint16 y6i = y; y6i < toY; y6i += 6) {
                    uint256 id6x6 = LAYER_6x6 + x6i + y6i * GRID_SIZE;
                    require(_owners[id6x6] == 0, "Already minted as 6x6");
                }
            }
        }

        if (size <= 3) {
            require(_owners[LAYER_3x3 + (x/3) * 3 + ((y/3) * 3) * GRID_SIZE] == 0, "Already minted as 3x3");
        } else {
            for (uint16 x3i = x; x3i < toX; x3i += 3) {
                for (uint16 y3i = y; y3i < toY; y3i += 3) {
                    uint256 id3x3 = LAYER_3x3 + x3i + y3i * GRID_SIZE;
                    require(_owners[id3x3] == 0, "Already minted as 3x3");
                }
            }
        }

        for (uint16 xi = x; xi < toX; xi++) {
            for (uint16 yi = y; yi < toY; yi++) {
                uint256 id1x1 = xi + yi * GRID_SIZE;
                require(_owners[id1x1] == 0, "Already minted");
                emit Transfer(address(0), to, id1x1);
            }
        }

        _owners[blockId] = uint256(to);
        _numNFTPerAddress[to] += size * size;
    }

    function _ownerOf(uint256 id) internal view returns (address) {
        require(id & LAYER == 0, "Invalid token id");
        uint256 x = id % GRID_SIZE;
        uint256 y = id / GRID_SIZE;
        uint256 owner1x1 = _owners[id];

        if (owner1x1 != 0) {
            return address(owner1x1); // cast to zero
        } else {
            address owner3x3 = address(_owners[LAYER_3x3 + (x/3) * 3 + ((y/3) * 3) * GRID_SIZE]);
            if (owner3x3 != address(0)) {
                return owner3x3;
            } else {
                address owner6x6 = address(_owners[LAYER_6x6 + (x/6) * 6 + ((y/6) * 6) * GRID_SIZE]);
                if (owner6x6 != address(0)) {
                    return owner6x6;
                } else {
                    address owner12x12 = address(_owners[LAYER_12x12 + (x/12) * 12 + ((y/12) * 12) * GRID_SIZE]);
                    if (owner12x12 != address(0)) {
                        return owner12x12;
                    } else {
                        return address(_owners[LAYER_24x24 + (x/24) * 24 + ((y/24) * 24) * GRID_SIZE]);
                    }
                }
            }
        }
        return address(0); // explicit return
    }

}
