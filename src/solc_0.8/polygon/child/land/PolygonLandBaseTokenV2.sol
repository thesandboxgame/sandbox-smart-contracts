// SPDX-License-Identifier: MIT
// solhint-disable code-complexity

pragma solidity 0.8.2;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";
import "../../../common/BaseWithStorage/ERC721BaseTokenV2.sol";
import "../../../common/interfaces/IPolygonLand.sol";

abstract contract PolygonLandBaseTokenV2 is IPolygonLand, Initializable, ERC721BaseTokenV2 {
    using AddressUpgradeable for address;

    uint256 internal constant GRID_SIZE = 408;

    uint256 internal constant LAYER = 0xFF00000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_1x1 = 0x0000000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_3x3 = 0x0100000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_6x6 = 0x0200000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_12x12 = 0x0300000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_24x24 = 0x0400000000000000000000000000000000000000000000000000000000000000;

    mapping(address => bool) internal _minters;

    event Minter(address minter, bool enabled);

    struct Land {
        uint256 x;
        uint256 y;
        uint256 size;
    }

    modifier validQuad(
        uint256 size,
        uint256 x,
        uint256 y
    ) {
        require(size == 1 || size == 3 || size == 6 || size == 12 || size == 24, "Invalid size");
        require(x % size == 0 && y % size == 0, "Invalid coordinates");
        require(x <= GRID_SIZE - size && y <= GRID_SIZE - size, "Out of bounds");

        _;
    }

    /// @notice transfer multiple quad (aligned to a quad tree with size 3, 6, 12 or 24 only)
    /// @param from current owner of the quad
    /// @param to destination
    /// @param sizes list of sizes for each quad
    /// @param xs list of bottom left x coordinates for each quad
    /// @param ys list of bottom left y coordinates for each quad
    /// @param data additional data
    function batchTransferQuad(
        address from,
        address to,
        uint256[] calldata sizes,
        uint256[] calldata xs,
        uint256[] calldata ys,
        bytes calldata data
    ) external override {
        require(from != address(0), "from is zero address");
        require(to != address(0), "can't send to zero address");
        require(sizes.length == xs.length && xs.length == ys.length, "invalid data");
        if (_msgSender() != from) {
            require(
                _operatorsForAll[from][_msgSender()] || _superOperators[_msgSender()],
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
                _checkOnERC721BatchReceived(_msgSender(), from, to, ids, data),
                "erc721 batch transfer rejected by to"
            );
        }
    }

    /// @notice Enable or disable the ability of `minter` to transfer tokens of all (minter rights).
    /// @param minter address that will be given/removed minter right.
    /// @param enabled set whether the minter is enabled or disabled.
    function setMinter(address minter, bool enabled) external {
        require(_msgSender() == _admin, "only admin is allowed to add minters");
        require(minter != address(0), "PolygonLand: Invalid address");
        _minters[minter] = enabled;
        emit Minter(minter, enabled);
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
    ) external override {
        require(from != address(0), "from is zero address");
        require(to != address(0), "can't send to zero address");
        if (_msgSender() != from) {
            require(
                _operatorsForAll[from][_msgSender()] || _superOperators[_msgSender()],
                "not authorized to transferQuad"
            );
        }
        _transferQuad(from, to, size, x, y);
        _numNFTPerAddress[from] -= size * size;
        _numNFTPerAddress[to] += size * size;

        _checkBatchReceiverAcceptQuad(_msgSender(), from, to, size, x, y, data);
    }

    /**
     * @notice Mint a new quad (aligned to a quad tree with size 1, 3, 6, 12 or 24 only)
     * @param user The recipient of the new quad
     * @param size The size of the new quad
     * @param x The top left x coordinate of the new quad
     * @param y The top left y coordinate of the new quad
     * @param data extra data to pass to the transfer
     */
    function mintQuad(
        address user,
        uint256 size,
        uint256 x,
        uint256 y,
        bytes memory data
    ) external virtual override validQuad(size, x, y) {
        require(isMinter(_msgSender()), "!AUTHORIZED");
        _mintQuad(user, size, x, y, data);
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
    ) external virtual {
        require(isMinter(msg.sender), "!AUTHORIZED");
        require(to != address(0), "to is zero address");

        if (exists(size, x, y) == true) {
            _transferQuad(msg.sender, to, size, x, y);
            _numNFTPerAddress[msg.sender] -= size * size;
            _numNFTPerAddress[to] += size * size;
            _checkBatchReceiverAcceptQuad(msg.sender, msg.sender, to, size, x, y, data);
        } else {
            _mintAndTransferQuad(to, size, x, y, data);
        }
    }

    /// @notice x coordinate of Land token
    /// @param id tokenId
    /// @return the x coordinates
    function getX(uint256 id) external pure returns (uint256) {
        return _getX(id);
    }

    function batchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids,
        bytes calldata data
    ) public virtual override(ILandToken, ERC721BaseTokenV2) {
        super.batchTransferFrom(from, to, ids, data);
    }

    /// @notice y coordinate of Land token
    /// @param id tokenId
    /// @return the y coordinates
    function getY(uint256 id) external pure returns (uint256) {
        return _getY(id);
    }

    /**
     * @notice Check if the contract supports an interface
     * 0x01ffc9a7 is ERC-165
     * 0x80ac58cd is ERC-721
     * 0x5b5e139f is ERC-721 metadata
     * @param id The id of the interface
     * @return True if the interface is supported
     */
    function supportsInterface(bytes4 id) public pure override returns (bool) {
        return id == 0x01ffc9a7 || id == 0x80ac58cd || id == 0x5b5e139f;
    }

    /**
     * @notice Return the name of the token contract
     * @return The name of the token contract
     */
    function name() public pure returns (string memory) {
        return "Sandbox's LANDs";
    }

    /// @notice check whether address `who` is given minter rights.
    /// @param who The address to query.
    /// @return whether the address has minter rights.
    function isMinter(address who) public view returns (bool) {
        return _minters[who];
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
    ) public view override validQuad(size, x, y) returns (bool) {
        return _ownerOfQuad(size, x, y) != address(0);
    }

    /**
     * @notice Return the symbol of the token contract
     * @return The symbol of the token contract
     */
    function symbol() public pure returns (string memory) {
        return "LAND";
    }

    /// @notice total width of the map
    /// @return width
    function width() public pure returns (uint256) {
        return GRID_SIZE;
    }

    /// @notice total height of the map
    /// @return height
    function height() public pure returns (uint256) {
        return GRID_SIZE;
    }

    /**
     * @notice Return the URI of a specific token
     * @param id The id of the token
     * @return The URI of the token
     */
    function tokenURI(uint256 id) public view returns (string memory) {
        require(_ownerOf(id) != address(0), "Id does not exist");
        return
            string(
                abi.encodePacked("https://api.sandbox.game/lands/", StringsUpgradeable.toString(id), "/metadata.json")
            );
    }

    function _transferQuad(
        address from,
        address to,
        uint256 size,
        uint256 x,
        uint256 y
    ) internal validQuad(size, x, y) {
        if (size == 1) {
            uint256 id1x1 = _getQuadId(LAYER_1x1, x, y);
            address owner = _ownerOf(id1x1);
            require(owner != address(0), "token does not exist");
            require(owner == from, "not owner in _transferQuad");
            _owners[id1x1] = uint256(uint160(address(to)));
        } else {
            _regroup(from, to, size, x, y);
        }
        for (uint256 i = 0; i < size * size; i++) {
            emit Transfer(from, to, _idInPath(i, size, x, y));
        }
    }

    function _mintQuad(
        address to,
        uint256 size,
        uint256 x,
        uint256 y,
        bytes memory data
    ) internal {
        require(to != address(0), "to is zero address");

        (uint256 layer, , ) = _getQuadLayer(size);
        uint256 quadId = _getQuadId(layer, x, y);

        _checkOwner(size, x, y, 24);
        for (uint256 i = 0; i < size * size; i++) {
            uint256 _id = _idInPath(i, size, x, y);
            require(_owners[_id] == 0, "Already minted");
            emit Transfer(address(0), to, _id);
        }

        _owners[quadId] = uint256(uint160(to));
        _numNFTPerAddress[to] += size * size;

        _checkBatchReceiverAcceptQuad(msg.sender, address(0), to, size, x, y, data);
    }

    function _mintAndTransferQuad(
        address to,
        uint256 size,
        uint256 x,
        uint256 y,
        bytes memory data
    ) internal {
        (uint256 layer, , ) = _getQuadLayer(size);
        uint256 quadId = _getQuadId(layer, x, y);

        // Length of array is equal to number of 3x3 child quad a 24x24 quad can have
        Land[] memory quadMinted = new Land[](64);
        uint256 index;
        uint256 landMinted;

        if (size > 3) {
            (index, landMinted) = _checkAndClearOwner(
                Land({x: x, y: y, size: size}),
                quadMinted,
                landMinted,
                index,
                size / 2
            );
        }

        {
            for (uint256 i = 0; i < size * size; i++) {
                uint256 _id = _idInPath(i, size, x, y);
                bool isAlreadyMinted = _isQuadMinted(quadMinted, Land({x: _getX(_id), y: _getY(_id), size: 1}), index);
                if (isAlreadyMinted) {
                    emit Transfer(msg.sender, to, _id);
                } else {
                    if (_owners[_id] == uint256(uint160(msg.sender))) {
                        landMinted += 1;
                        emit Transfer(msg.sender, to, _id);
                    } else {
                        require(_owners[_id] == 0, "Already minted");

                        emit Transfer(address(0), to, _id);
                    }
                }
            }
        }

        _checkBatchReceiverAcceptQuadAndClearOwner(quadMinted, index, landMinted, to, size, x, y, data);

        _owners[quadId] = uint256(uint160(to));
        _numNFTPerAddress[to] += size * size;
        _numNFTPerAddress[msg.sender] -= landMinted;
    }

    function _checkAndClearOwner(
        Land memory land,
        Land[] memory quadMinted,
        uint256 landMinted,
        uint256 index,
        uint256 quadCompareSize
    ) internal returns (uint256, uint256) {
        (uint256 layer, , ) = _getQuadLayer(quadCompareSize);
        uint256 toX = land.x + land.size;
        uint256 toY = land.y + land.size;

        for (uint256 xi = land.x; xi < toX; xi += quadCompareSize) {
            for (uint256 yi = land.y; yi < toY; yi += quadCompareSize) {
                bool isQuadChecked = _isQuadMinted(quadMinted, Land({x: xi, y: yi, size: quadCompareSize}), index);
                if (!isQuadChecked) {
                    uint256 id = _getQuadId(layer, xi, yi);
                    address owner = address(uint160(_owners[id]));

                    if (owner == msg.sender) {
                        quadMinted[index] = Land({x: xi, y: yi, size: quadCompareSize});
                        index++;
                        landMinted += quadCompareSize * quadCompareSize;
                        _owners[id] = 0;
                    } else {
                        require(owner == address(0), "Already minted");
                    }
                }
            }
        }

        quadCompareSize = quadCompareSize / 2;
        if (quadCompareSize >= 3)
            (index, landMinted) = _checkAndClearOwner(land, quadMinted, landMinted, index, quadCompareSize);
        return (index, landMinted);
    }

    function _checkAndClear(address from, uint256 id) internal returns (bool) {
        uint256 owner = _owners[id];
        if (owner != 0) {
            require((owner & BURNED_FLAG) != BURNED_FLAG, "not owner");
            require(address(uint160(owner)) == from, "not owner");
            _owners[id] = 0;
            return true;
        }
        return false;
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

    function _checkBatchReceiverAcceptQuadAndClearOwner(
        Land[] memory quadMinted,
        uint256 index,
        uint256 landMinted,
        address to,
        uint256 size,
        uint256 x,
        uint256 y,
        bytes memory data
    ) internal {
        if (to.isContract() && _checkInterfaceWith10000Gas(to, ERC721_MANDATORY_RECEIVER)) {
            uint256[] memory idsToTransfer = new uint256[](landMinted);
            uint256 transferIndex;
            uint256[] memory idsToMint = new uint256[]((size * size) - landMinted);
            uint256 mintIndex;

            for (uint256 i = 0; i < size * size; i++) {
                uint256 id = _idInPath(i, size, x, y);

                if (_isQuadMinted(quadMinted, Land({x: _getX(id), y: _getY(id), size: 1}), index)) {
                    idsToTransfer[transferIndex] = id;
                    transferIndex++;
                } else if (_owners[id] == uint256(uint160(msg.sender))) {
                    _owners[id] = 0;
                    idsToTransfer[transferIndex] = id;
                    transferIndex++;
                } else {
                    idsToMint[mintIndex] = id;
                    mintIndex++;
                }
            }
            require(
                _checkOnERC721BatchReceived(msg.sender, address(0), to, idsToMint, data),
                "erc721 batch transfer rejected by to"
            );
            require(
                _checkOnERC721BatchReceived(msg.sender, msg.sender, to, idsToTransfer, data),
                "erc721 batch transfer rejected by to"
            );
        } else {
            for (uint256 i = 0; i < size * size; i++) {
                uint256 id = _idInPath(i, size, x, y);
                if (_owners[id] == uint256(uint160(msg.sender))) _owners[id] = 0;
            }
        }
    }

    function _getX(uint256 id) internal pure returns (uint256) {
        return ((id << 8) >> 8) % GRID_SIZE;
    }

    function _getY(uint256 id) internal pure returns (uint256) {
        return ((id << 8) >> 8) / GRID_SIZE;
    }

    function _isQuadMinted(
        Land[] memory mintedLand,
        Land memory quad,
        uint256 index
    ) internal pure returns (bool) {
        for (uint256 i = 0; i < index; i++) {
            Land memory land = mintedLand[i];
            if (
                land.size > quad.size &&
                quad.x >= land.x &&
                quad.x < land.x + land.size &&
                quad.y >= land.y &&
                quad.y < land.y + land.size
            ) {
                return true;
            }
        }
        return false;
    }

    function _getQuadLayer(uint256 size)
        internal
        pure
        returns (
            uint256 layer,
            uint256 parentSize,
            uint256 childLayer
        )
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

    function _getQuadId(
        uint256 layer,
        uint256 x,
        uint256 y
    ) internal pure returns (uint256 quadId) {
        quadId = layer + x + y * GRID_SIZE;
    }

    function _checkOwner(
        uint256 size,
        uint256 x,
        uint256 y,
        uint256 quadCompareSize
    ) internal view {
        (uint256 layer, , ) = _getQuadLayer(quadCompareSize);

        if (size <= quadCompareSize) {
            // when the size of the quad is smaller than the quadCompareSize(size to be compared with),
            // then it is checked if the bigger quad which encapsulates the quad to be minted
            // of with size equals the quadCompareSize has been minted or not
            require(
                _owners[
                    _getQuadId(layer, (x / quadCompareSize) * quadCompareSize, (y / quadCompareSize) * quadCompareSize)
                ] == 0,
                "Already minted"
            );
        } else {
            // when the size is smaller than the quadCompare size the owner of all the smaller quads with size
            // quadCompare size in the quad to be minted are checked if they are minted or not
            uint256 toX = x + size;
            uint256 toY = y + size;
            for (uint256 xi = x; xi < toX; xi += quadCompareSize) {
                for (uint256 yi = y; yi < toY; yi += quadCompareSize) {
                    require(_owners[_getQuadId(layer, xi, yi)] == 0, "Already minted");
                }
            }
        }

        quadCompareSize = quadCompareSize / 2;
        if (quadCompareSize >= 3) _checkOwner(size, x, y, quadCompareSize);
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
            return _getQuadId(LAYER_1x1, (x + (i % size)), (y + row));
        } else {
            return _getQuadId(LAYER_1x1, (x + size) - (1 + (i % size)), (y + row));
        }
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
            _regroupQuad(from, to, Land({x: x, y: y, size: size}), true, size / 2);
        } else {
            require(false, "Invalid size");
        }
    }

    /// @dev checks if the Land's child quads are owned by the from address and clears all the previous owners
    /// if all the child quads are not owned by the "from" address then the owner of parent quad to the land
    /// is checked if owned by the "from" address. If from is the owner then land owner is set to "to" address
    /// @param from address of the previous owner
    /// @param to address of the new owner
    /// @param land the quad to be regrouped and transfered
    /// @param set for setting the new owner
    /// @param childQuadSize  size of the child quad to be checked for owner in the regrouping
    function _regroupQuad(
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
            // double for loop itereates and checks owner of all the smaller quads in land
            for (uint256 xi = land.x; xi < land.x + land.size; xi += childQuadSize) {
                for (uint256 yi = land.y; yi < land.y + land.size; yi += childQuadSize) {
                    uint256 ownerChild;
                    bool ownAllIndividual;
                    if (childQuadSize < 3) {
                        // case when the smaller quad is 1x1,
                        ownAllIndividual = _checkAndClear(from, _getQuadId(LAYER_1x1, xi, yi)) && ownerOfAll;
                    } else {
                        // recursively calling the _regroupQuad function to check the owner of child quads.
                        ownAllIndividual = _regroupQuad(
                            from,
                            to,
                            Land({x: xi, y: yi, size: childQuadSize}),
                            false,
                            childQuadSize / 2
                        );
                        uint256 idChild = _getQuadId(childLayer, xi, yi);
                        ownerChild = _owners[idChild];
                        if (ownerChild != 0) {
                            // checking the owner of child quad
                            if (!ownAllIndividual) {
                                require(ownerChild == uint256(uint160(from)), "not owner of child Quad");
                            }
                            // clearing owner of child qua
                            _owners[idChild] = 0;
                        }
                    }
                    // ownerOfAll should be true if "from" is owner of all the child quads ittereated over
                    ownerOfAll = (ownAllIndividual || ownerChild != 0) && ownerOfAll;
                }
            }
        }

        // if set is true it check if the "from" is owner of all else checks for the owner of parent quad is
        // owned by "from" and sets the owner for the id of land to "to" address.
        if (set) {
            if (!ownerOfAll) {
                require(_ownerOfQuad(land.size, land.x, land.y) == from, "not owner of all sub quads nor parent quads");
            }
            _owners[quadId] = uint256(uint160(to));
            return true;
        }

        return ownerOfAll;
    }

    function _ownerOfQuad(
        uint256 size,
        uint256 x,
        uint256 y
    ) internal view returns (address) {
        (uint256 layer, uint256 parentSize, ) = _getQuadLayer(size);
        address owner = address(uint160(_owners[_getQuadId(layer, (x / size) * size, (y / size) * size)]));
        if (owner != address(0)) {
            return owner;
        } else if (size < 24) {
            return _ownerOfQuad(parentSize, x, y);
        }
        return address(0);
    }

    function _getQuadById(uint256 id)
        internal
        pure
        returns (
            uint256 size,
            uint256 x,
            uint256 y
        )
    {
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

    function _ownerOf(uint256 id) internal view override returns (address) {
        (uint256 size, uint256 x, uint256 y) = _getQuadById(id);
        require(x % size == 0 && y % size == 0, "Invalid token id");
        if (size == 1) {
            uint256 owner1x1 = _owners[id];
            return (owner1x1 & BURNED_FLAG) == BURNED_FLAG ? address(0) : _ownerOfQuad(size, x, y);
        }
        return _ownerOfQuad(size, x, y);
    }

    function _ownerAndOperatorEnabledOf(uint256 id)
        internal
        view
        override
        returns (address owner, bool operatorEnabled)
    {
        require(id & LAYER == 0, "Invalid token id");
        uint256 x = id % GRID_SIZE;
        uint256 y = id / GRID_SIZE;
        uint256 owner1x1 = _owners[id];

        if ((owner1x1 & BURNED_FLAG) == BURNED_FLAG) {
            owner = address(0);
            operatorEnabled = (owner1x1 & OPERATOR_FLAG) == OPERATOR_FLAG;
            return (owner, operatorEnabled);
        }

        if (owner1x1 != 0) {
            owner = address(uint160(owner1x1));
            operatorEnabled = (owner1x1 & OPERATOR_FLAG) == OPERATOR_FLAG;
        } else {
            owner = _ownerOfQuad(3, (x * 3) / 3, (y * 3) / 3);
            operatorEnabled = false;
        }
    }

    // Empty storage space in contracts for future enhancements
    // ref: https://github.com/OpenZeppelin/openzeppelin-contracts-upgradeable/issues/13)
    uint256[49] private __gap;
}
