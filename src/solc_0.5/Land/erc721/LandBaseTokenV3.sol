/* solhint-disable func-order, code-complexity */
pragma solidity 0.5.9;

import "./ERC721BaseTokenV2.sol";

contract LandBaseTokenV3 is ERC721BaseTokenV2 {
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

    struct Land {
        uint256 x;
        uint256 y;
        uint256 size;
    }

    /// @notice Enable or disable the ability of `minter` to mint tokens
    /// @param minter address that will be given/removed minter right.
    /// @param enabled set whether the minter is enabled or disabled.
    function setMinter(address minter, bool enabled) external onlyAdmin {
        require(minter != address(0), "address 0 is not allowed as minter");
        require(enabled != _minters[minter], "the status should be different than the current one");
        _minters[minter] = enabled;
        emit Minter(minter, enabled);
    }

    /// @notice check whether address `who` is given minter rights.
    /// @param who The address to query.
    /// @return whether the address has minter rights.
    function isMinter(address who) public view returns (bool) {
        return _minters[who];
    }

    /// @notice total width of the map
    /// @return width
    function width() external pure returns (uint256) {
        return GRID_SIZE;
    }

    /// @notice total height of the map
    /// @return height
    function height() external pure returns (uint256) {
        return GRID_SIZE;
    }

    /// @notice x coordinate of Land token
    /// @param id tokenId
    /// @return the x coordinates
    function getX(uint256 id) external view returns (uint256) {
        require(_ownerOf(id) != address(0), "token does not exist");
        return _getX(id);
    }

    /// @notice y coordinate of Land token
    /// @param id tokenId
    /// @return the y coordinates
    function getY(uint256 id) external view returns (uint256) {
        require(_ownerOf(id) != address(0), "token does not exist");
        return _getY(id);
    }

    function _getX(uint256 id) internal pure returns(uint256) {
        return ((id << 8) >> 8) % GRID_SIZE;
    }

    function _getY(uint256 id) internal pure returns(uint256) {
        return ((id << 8) >> 8) / GRID_SIZE;
    }

    /**
     * @notice Mint a new quad (aligned to a quad tree with size 1, 3, 6, 12 or 24 only)
     * @param to The recipient of the new quad
     * @param size The size of the new quad
     * @param x The top left x coordinate of the new quad
     * @param y The top left y coordinate of the new quad
     * @param data extra data to pass to the transfer
     */
    function mintQuad(
        address to,
        uint256 size,
        uint256 x,
        uint256 y,
        bytes calldata data
    ) external {
        require(to != address(0), "to is zero address");
        require(isMinter(msg.sender), "Only a minter can mint");
        require(x % size == 0 && y % size == 0, "Invalid coordinates");
        require(x <= GRID_SIZE - size && y <= GRID_SIZE - size, "Out of bounds");
        
        (uint256 layer, , ) = _getQuadLayer(size);
        uint256 quadId = _getQuadId(layer, x, y);

        checkOwner(size, x, y, 24);
        for (uint256 i = 0; i < size * size; i++) {
            uint256 _id = _idInPath(i, size, x, y);
            require(_owners[_id] == 0, "Already minted");
            emit Transfer(address(0), to, _id);
        }

        _owners[quadId] = uint256(to);
        _numNFTPerAddress[to] += size * size;

        _checkBatchReceiverAcceptQuad(msg.sender, address(0), to, size, x, y, data);
    }

    function _getQuadLayer(uint256 size) internal  pure returns (uint256 layer, uint256 parentSize, uint256 childLayer)
    {
        if (size == 1) {
            layer = LAYER_1x1;
            parentSize = 3;
        } else if (size == 3) {
            layer = LAYER_3x3;
            parentSize = 6;
        } else if (size == 6) {
            layer = LAYER_6x6;
            parentSize = 12;
            childLayer = LAYER_3x3;
        } else if (size == 12) {
            layer = LAYER_12x12;
            parentSize = 24;
            childLayer = LAYER_6x6;
        } else if (size == 24) {
            layer = LAYER_24x24;
            childLayer = LAYER_12x12;
        } else {
            require(false, "Invalid size");
        }
    }

    function _getQuadId(uint256 layer, uint256 x, uint256 y) internal pure returns (uint256 quadId){
        quadId = layer + x + y * GRID_SIZE;
    }


    function checkOwner(
        uint256 size,
        uint256 x,
        uint256 y,
        uint256 quadCompareSize
    ) internal view {
        (uint256 layer, , ) = _getQuadLayer(quadCompareSize);
    
        if (size <= quadCompareSize) {
            require(
                _owners[
                   _getQuadId(layer, (x / quadCompareSize) *
                        quadCompareSize, (y / quadCompareSize) * quadCompareSize)
                ] == 0,
                "Already minted"
            );
        } else {
            uint256 toX = x + size;
            uint256 toY = y + size;
            for (uint256 xi = x; xi < toX; xi += quadCompareSize) {
                for (uint256 yi = y; yi < toY; yi += quadCompareSize) {
                    require(_owners[_getQuadId(layer, xi, yi)] == 0, "Already minted");
                }
            }
        }

        quadCompareSize = quadCompareSize / 2;
        if (quadCompareSize >= 3) checkOwner(size, x, y, quadCompareSize);
    }

    /**
     * @notice Checks if a parent quad has child quads already minted.
     *  Then mints the rest child quads and transfers the parent quad.
     *  Should only be called by the tunnel.
     * @param to The recipient of the new quad
     * @param size The size of the new quad
     * @param x The top left x coordinate of the new quad
     * @param y The top left y coordinate of the new quad
     * @param data extra data to pass to the transfer
     */
    function mintAndTransferQuad(
        address to,
        uint256 size,
        uint256 x,
        uint256 y,
        bytes calldata data
    ) external {
        if (exists(size, x, y) == true) {
            _transferQuad(msg.sender, to, size, x, y);
            _numNFTPerAddress[msg.sender] -= size * size;
            _numNFTPerAddress[to] += size * size;
            _checkBatchReceiverAcceptQuad(msg.sender, msg.sender, to, size, x, y, data);
        } else {
            _mintAndTransferQuad(to, size, x, y, data);
        }
    }

    function _mintAndTransferQuad(
        address to,
        uint256 size,
        uint256 x,
        uint256 y,
        bytes memory data
    ) internal {
        require(to != address(0), "to is zero address");
        require(isMinter(msg.sender), "Only a minter can mint");

        (uint256 layer, , ) = _getQuadLayer(size);
        uint256 quadId = _getQuadId(layer, x, y);

        Land[] memory mintedLand = new Land[](64);
        uint256 index;

        checkAndClearOwner(size, x, y, mintedLand, index, 12);

        for (uint256 i = 0; i < size * size; i++) {
            uint256 _id = _idInPath(i, size, x, y);
            uint256 xi = _getX(_id);
            uint256 yi = _getY(_id);
            bool isAlreadyMinted = isQuadMinted(mintedLand, xi, yi, 1, index);
            if (isAlreadyMinted) {
                emit Transfer(msg.sender, to, _id);
            } else {
                if (_owners[_id] == uint256(msg.sender)) {
                    _owners[_id] = 0;
                    emit Transfer(msg.sender, to, _id);
                } else {
                    require(_owners[_id] == 0, "Already minted");
                    emit Transfer(address(0), to, _id);
                }
            }
        }

        _owners[quadId] = uint256(to);
        _numNFTPerAddress[to] += size * size;

        _checkBatchReceiverAcceptQuad(msg.sender, address(0), to, size, x, y, data);
    }

    function checkAndClearOwner(
        uint256 size,
        uint256 x,
        uint256 y,
        Land[] memory mintedLand,
        uint256 index,
        uint256 quadCompareSize
    ) internal {
        (uint256 layer, , ) = _getQuadLayer(quadCompareSize);
        uint256 toX = x + size;
        uint256 toY = y + size;

        if (size >= quadCompareSize) {
            for (uint256 xi = x; xi < toX; xi += quadCompareSize) {
                for (uint256 yi = y; yi < toY; yi += quadCompareSize) {
                    bool isQuadChecked = isQuadMinted(mintedLand, xi, yi, quadCompareSize, index);
                    if (!isQuadChecked) {
                        uint256 id = _getQuadId(layer, xi, yi);
                        address owner = address(uint160(_owners[id]));

                        if (owner == msg.sender) {
                            mintedLand[index] = Land({x: xi, y: yi, size: quadCompareSize});
                            index++;
                            _owners[id] = 0;
                        } else {
                            require(owner == address(0), "Already minted");
                        }
                    }
                }
            }
        }

        quadCompareSize = quadCompareSize / 2;
        if (quadCompareSize >= 3) checkAndClearOwner(size, x, y, mintedLand, index, quadCompareSize);
    }

    function isQuadMinted(
        Land[] memory mintedLand,
        uint256 x,
        uint256 y,
        uint256 size,
        uint256 index
    ) internal pure returns (bool) {
        for (uint256 i = 0; i <= index; i++) {
            Land memory land = mintedLand[i];
            if (land.size != 0 && land.size > size) {
                if (x >= land.x && x < land.x + land.size) {
                    if (y >= land.y && y < land.y + land.size) return true;
                }
            }
        }
        return false;
    }

    function _idInPath(
        uint256 i,
        uint256 size,
        uint256 x,
        uint256 y
    ) internal pure returns (uint256) {
        uint256 row = i / size;
        if (row % 2 == 0) {
            // allow ids to follow a path in a quad
            return (x + (i % size)) + ((y + row) * GRID_SIZE);
        } else {
            return ((x + size) - (1 + (i % size))) + ((y + row) * GRID_SIZE);
        }
    }

    /// @notice transfer one quad (aligned to a quad tree with size 3, 6, 12 or 24 only)
    /// @param from current owner of the quad
    /// @param to destination
    /// @param size size of the quad
    /// @param x The top left x coordinate of the quad
    /// @param y The top left y coordinate of the quad
    /// @param data additional data
    function transferQuad(
        address from,
        address to,
        uint256 size,
        uint256 x,
        uint256 y,
        bytes calldata data
    ) external {
        require(from != address(0), "from is zero address");
        require(to != address(0), "can't send to zero address");
        bool metaTx = msg.sender != from && _metaTransactionContracts[msg.sender];
        if (msg.sender != from && !metaTx) {
            require(
                _operatorsForAll[from][msg.sender] || _superOperators[msg.sender],
                "not authorized to transferQuad"
            );
        }
        _transferQuad(from, to, size, x, y);
        _numNFTPerAddress[from] -= size * size;
        _numNFTPerAddress[to] += size * size;

        _checkBatchReceiverAcceptQuad(metaTx ? from : msg.sender, from, to, size, x, y, data);
    }

    function _checkBatchReceiverAcceptQuad(
        address operator,
        address from,
        address to,
        uint256 size,
        uint256 x,
        uint256 y,
        bytes memory data
    ) internal {
        if (to.isContract() && _checkInterfaceWith10000Gas(to, ERC721_MANDATORY_RECEIVER)) {
            uint256[] memory ids = new uint256[](size * size);
            for (uint256 i = 0; i < size * size; i++) {
                ids[i] = _idInPath(i, size, x, y);
            }
            require(_checkOnERC721BatchReceived(operator, from, to, ids, data), "erc721 batch transfer rejected by to");
        }
    }

    /// @notice transfer multiple quad (aligned to a quad tree with size 3, 6, 12 or 24 only)
    /// @param from current owner of the quad
    /// @param to destination
    /// @param sizes list of sizes for each quad
    /// @param xs list of top left x coordinates for each quad
    /// @param ys list of top left y coordinates for each quad
    /// @param data additional data
    function batchTransferQuad(
        address from,
        address to,
        uint256[] calldata sizes,
        uint256[] calldata xs,
        uint256[] calldata ys,
        bytes calldata data
    ) external {
        require(from != address(0), "from is zero address");
        require(to != address(0), "can't send to zero address");
        require(sizes.length == xs.length && xs.length == ys.length, "invalid data");
        bool metaTx = msg.sender != from && _metaTransactionContracts[msg.sender];
        if (msg.sender != from && !metaTx) {
            require(
                _operatorsForAll[from][msg.sender] || _superOperators[msg.sender],
                "not authorized to transferMultiQuads"
            );
        }
        uint256 numTokensTransfered = 0;
        for (uint256 i = 0; i < sizes.length; i++) {
            uint256 size = sizes[i];
            _transferQuad(from, to, size, xs[i], ys[i]);
            numTokensTransfered += size * size;
        }
        _numNFTPerAddress[from] -= numTokensTransfered;
        _numNFTPerAddress[to] += numTokensTransfered;

        if (to.isContract() && _checkInterfaceWith10000Gas(to, ERC721_MANDATORY_RECEIVER)) {
            uint256[] memory ids = new uint256[](numTokensTransfered);
            uint256 counter = 0;
            for (uint256 j = 0; j < sizes.length; j++) {
                uint256 size = sizes[j];
                for (uint256 i = 0; i < size * size; i++) {
                    ids[counter] = _idInPath(i, size, xs[j], ys[j]);
                    counter++;
                }
            }
            require(
                _checkOnERC721BatchReceived(metaTx ? from : msg.sender, from, to, ids, data),
                "erc721 batch transfer rejected by to"
            );
        }
    }

    function _transferQuad(
        address from,
        address to,
        uint256 size,
        uint256 x,
        uint256 y
    ) internal {
        if (size == 1) {
            uint256 id1x1 = _getQuadId(LAYER_1x1, x, y);
            address owner = _ownerOf(id1x1);
            require(owner != address(0), "token does not exist");
            require(owner == from, "not owner in _transferQuad");
            _owners[id1x1] = uint256(to);
        } else {
            _regroup(from, to, size, x, y);
        }
        for (uint256 i = 0; i < size * size; i++) {
            emit Transfer(from, to, _idInPath(i, size, x, y));
        }
    }

    function _checkAndClear(address from, uint256 id) internal returns (bool) {
        uint256 owner = _owners[id];
        if (owner != 0) {
            require(address(owner) == from, "not owner");
            _owners[id] = 0;
            return true;
        }
        return false;
    }

    function _regroup(
        address from,
        address to,
        uint256 size,
        uint256 x,
        uint256 y
    ) internal {
        require(x % size == 0 && y % size == 0, "Invalid coordinates");
        require(x <= GRID_SIZE - size && y <= GRID_SIZE - size, "Out of bounds");
        if (size == 3 || size == 6 || size == 12 || size == 24) {
            regroupQuad(from, to, Land({x: x, y: y, size: size}), true, size / 2);
        } else {
            require(false, "Invalid size");
        }
    }

    /// @notice checks if Land has been minted or not
    /// @param size size of the
    /// @param x x coordinate of the quad
    /// @param y y coordinate of the quad
    /// @return bool for if Land has been minted or not
    function exists(
        uint256 size,
        uint256 x,
        uint256 y
    ) public view returns (bool) {
        require(x % size == 0 && y % size == 0, "Invalid coordinates");
        require(x <= GRID_SIZE - size && y <= GRID_SIZE - size, "Out of bounds");
        return _ownerOfQuad(size, x, y) != address(0);
    }

    function _ownerOfQuad(
        uint256 size,
        uint256 x,
        uint256 y
    ) internal view returns (address) {
        (uint256 layer, uint256 parentSize, ) = _getQuadLayer(size);
        address owner = address(_owners[_getQuadId(layer, (x/size)*size, (y/size)*size)]);
        if (owner != address(0)) {
            return owner;
        } else if (size < 24) {
            return _ownerOfQuad(parentSize, x, y);
        }
        return address(0);
    }

    function regroupQuad(
        address from,
        address to,
        Land memory land,
        bool set,
        uint256 childQuadSize
    ) internal returns (bool) {
        (uint256 layer, , uint256 childLayer) = _getQuadLayer(land.size);
        uint256 quadId = _getQuadId(layer, land.x, land.y);
        bool ownerOfAll = true;

        {
            for (uint256 xi = land.x; xi < land.x + land.size; xi += childQuadSize) {
                for (uint256 yi = land.y; yi < land.y + land.size; yi += childQuadSize) {
                    uint256 ownerChild;
                    bool ownAllIndividual;
                    if (childQuadSize < 3) {
                        ownAllIndividual = _checkAndClear(from, xi + yi * GRID_SIZE) && ownerOfAll;
                    } else {
                        ownAllIndividual = regroupQuad(
                            from,
                            to,
                            Land({x: xi, y: yi, size: childQuadSize}),
                            false,
                            childQuadSize / 2
                        );
                        uint256 idChild = _getQuadId(childLayer, xi, yi);
                        ownerChild = _owners[idChild];
                        if (ownerChild != 0) {
                            if (!ownAllIndividual) {
                                require(ownerChild == uint256(from), "not owner of child Quad");
                            }
                            _owners[idChild] = 0;
                        }
                    }
                    ownerOfAll = (ownAllIndividual || ownerChild != 0) && ownerOfAll;
                }
            }
        }

        if (set) {
            if (!ownerOfAll) {
                require(_ownerOfQuad(land.size, land.x, land.y) == from, "not owner of all sub quads nor parent quads");
            }
            _owners[quadId] = uint256(to);
            return true;
        }

        return ownerOfAll;
    }

    function _getQuadById(uint256 id) internal pure returns(uint256 size, uint256 x, uint256 y){
        x = _getX(id);
        y = _getY(id);
        uint256 layer = id & LAYER;
        if (layer == LAYER_1x1) {
            size = 1;
        } else if (layer == LAYER_3x3) {
            size = 3;
        } else if (layer == LAYER_6x6) {
            size = 6;
        } else if (layer == LAYER_12x12) {
            size = 12;
        } else if (layer == LAYER_24x24) {
            size = 24;
        } else {
            require(false, "Invalid token id");
        }
    }

    function _ownerOf(uint256 id) internal view returns (address) {
        (uint256 size, uint256 x, uint256 y) = _getQuadById(id);
        require(x % size == 0 && y % size == 0, "Invalid token id");
        return _ownerOfQuad(size, x, y);
    }

    function _ownerAndOperatorEnabledOf(uint256 id) internal view returns (address owner, bool operatorEnabled) {
        require(id & LAYER == 0, "Invalid token id");
        uint256 x = _getX(id);
        uint256 y = _getY(id);
        uint256 owner1x1 = _owners[id];

        if (owner1x1 != 0) {
            owner = address(owner1x1);
            operatorEnabled = (owner1x1 / 2**255) == 1;
        } else {
            owner = _ownerOfQuad(3, (x*3)/3, (y*3)/3);
            operatorEnabled = false;
        }
    }
}
