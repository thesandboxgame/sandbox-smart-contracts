//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;


library QuadLib {

    // Our grid is 408 x 408 lands
    uint256 internal constant GRID_SIZE = 408;

    uint256 internal constant LAYER = 0xFF00000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_1x1 = 0x0000000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_3x3 = 0x0100000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_6x6 = 0x0200000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_12x12 = 0x0300000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_24x24 = 0x0400000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant BURNED_FLAG = (2 ** 160);
    uint256 internal constant OPERATOR_FLAG = (2**255);

    struct Land {
        uint256 x;
        uint256 y;
        uint256 size;
    }

    function ownerAndOperatorEnabledOf(
        mapping(uint256 => uint256) storage _owners,
        uint256 id)
    public view returns (address owner, bool operatorEnabled)    {
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
            owner = ownerOfQuad(_owners, 3, (x * 3) / 3, (y * 3) / 3);
            operatorEnabled = false;
        }
    }

    function transferQuad(
        mapping(uint256 => uint256) storage _owners,
        address from,
        address to,
        uint256 size,
        uint256 x,
        uint256 y
    ) public {
        if (size == 1) {
            uint256 id1x1 = _getQuadId(LAYER_1x1, x, y);
            address owner = _ownerOf(_owners, id1x1);
            require(owner != address(0), "token does not exist");
            require(owner == from, "not owner in _transferQuad");
            _owners[id1x1] = uint256(uint160(address(to)));
        } else {
            _regroupQuad(_owners, from, to, Land({x : x, y : y, size : size}), true, size / 2);
        }
    }

    function checkOwner(
        mapping(uint256 => uint256) storage _owners,
        uint256 size,
        uint256 x,
        uint256 y,
        uint256 quadCompareSize
    ) public view {
        _checkOwner(_owners, size, x, y, quadCompareSize);
    }

    function ownerOfQuad(
        mapping(uint256 => uint256) storage _owners,
        uint256 size,
        uint256 x,
        uint256 y
    ) public view returns (address) {
        return _ownerOfQuad(_owners, size, x, y);
    }

    function ownerOf(mapping(uint256 => uint256) storage _owners,
        uint256 id) public view returns (address) {
        return _ownerOf(_owners, id);
    }

    function checkAndClearOwner(
        mapping(uint256 => uint256) storage _owners,
        Land memory land,
        Land[] memory quadMinted,
        uint256 quadCompareSize
    ) public returns (uint256, uint256) {
        return _checkAndClearOwner(_owners, land, quadMinted, 0, 0, quadCompareSize);
    }

    function _checkOwner(
        mapping(uint256 => uint256) storage _owners,
        uint256 size,
        uint256 x,
        uint256 y,
        uint256 quadCompareSize
    ) internal view {
        (uint256 layer, ,) = _getQuadLayer(quadCompareSize);

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
        if (quadCompareSize >= 3) _checkOwner(_owners, size, x, y, quadCompareSize);
    }

    /// @dev checks if the Land's child quads are owned by the from address and clears all the previous owners
    /// if all the child quads are not owned by the "from" address then the owner of parent quad to the land
    /// is checked if owned by the "from" address. If from is the owner then land owner is set to "to" address
    /// @param from address of the previous owner
    /// @param to address of the new owner
    /// @param land the quad to be regrouped and transferred
    /// @param set for setting the new owner
    /// @param childQuadSize  size of the child quad to be checked for owner in the regrouping
    function _regroupQuad(
        mapping(uint256 => uint256) storage _owners,
        address from,
        address to,
        Land memory land,
        bool set,
        uint256 childQuadSize
    ) private returns (bool) {
        (uint256 layer, , uint256 childLayer) = _getQuadLayer(land.size);
        uint256 quadId = _getQuadId(layer, land.x, land.y);
        bool ownerOfAll = true;

        {
            // double for loop iterates and checks owner of all the smaller quads in land
            for (uint256 xi = land.x; xi < land.x + land.size; xi += childQuadSize) {
                for (uint256 yi = land.y; yi < land.y + land.size; yi += childQuadSize) {
                    bool ownAllIndividual;
                    if (childQuadSize < 3) {
                        // case when the smaller quad is 1x1,
                        ownAllIndividual = _checkAndClearLandOwner(_owners, from, _getQuadId(LAYER_1x1, xi, yi)) && ownerOfAll;
                        // ownerOfAll should be true if "from" is owner of all the child quads itereated over
                        ownerOfAll = ownAllIndividual && ownerOfAll;
                    } else {
                        // recursively calling the _regroupQuad function to check the owner of child quads.
                        ownAllIndividual = _regroupQuad(
                            _owners,
                            from,
                            to,
                            Land({x : xi, y : yi, size : childQuadSize}),
                            false,
                            childQuadSize / 2
                        );
                        uint256 idChild = _getQuadId(childLayer, xi, yi);
                        if (_owners[idChild] != 0) {
                            // checking the owner of child quad
                            if (!ownAllIndividual) {
                                require(_owners[idChild] == uint256(uint160(from)), "not owner of child Quad");
                            }
                            // clearing owner of child quad
                            _owners[idChild] = 0;
                        } else {
                            // ownerOfAll should be true if "from" is owner of all the child quads itereated over
                            ownerOfAll = ownAllIndividual && ownerOfAll;
                        }
                    }
                }
            }
        }

        // if set is true it check if the "from" is owner of all else checks for the owner of parent quad is
        // owned by "from" and sets the owner for the id of land to "to" address.
        if (set) {
            if (!ownerOfAll) {
                require(_ownerOfQuad(_owners, land.size, land.x, land.y) == from, "not owner of all sub quads nor parent quads");
            }
            _owners[quadId] = uint256(uint160(to));
            return true;
        }

        return ownerOfAll;
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
    ) internal pure returns (uint256) {
        return layer + x + y * GRID_SIZE;
    }

    function _getX(uint256 id) internal pure returns (uint256) {
        return (id & ~LAYER) % GRID_SIZE;
    }

    function _getY(uint256 id) internal pure returns (uint256) {
        return (id & ~LAYER) / GRID_SIZE;
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

    /// @dev checks the owner of land with 'tokenId' to be 'from' and clears it
    /// @param from the address to be checked agains the owner of the land
    /// @param tokenId th id of land
    /// @return bool for if land is owned by 'from' or not.
    function _checkAndClearLandOwner(mapping(uint256 => uint256) storage _owners, address from, uint256 tokenId) private returns (bool) {
        uint256 currentOwner = _owners[tokenId];
        if (currentOwner != 0) {
            require((currentOwner & BURNED_FLAG) != BURNED_FLAG, "not owner");
            require(address(uint160(currentOwner)) == from, "not owner");
            _owners[tokenId] = 0;
            return true;
        }
        return false;
    }

    function _ownerOfQuad(
        mapping(uint256 => uint256) storage _owners,
        uint256 size,
        uint256 x,
        uint256 y
    ) private view returns (address) {
        (uint256 layer, uint256 parentSize,) = _getQuadLayer(size);
        address owner = address(uint160(_owners[_getQuadId(layer, (x / size) * size, (y / size) * size)]));
        if (owner != address(0)) {
            return owner;
        } else if (size < 24) {
            return _ownerOfQuad(_owners, parentSize, x, y);
        }
        return address(0);
    }

    function _ownerOf(mapping(uint256 => uint256) storage _owners, uint256 id) private view returns (address) {
        require(id & LAYER == 0, "Invalid token id");
        (uint256 size, uint256 x, uint256 y) = _getQuadById(id);
        require(x % size == 0, "x coordinate: Invalid token id");
        require(y % size == 0, "y coordinate: Invalid token id");
        if (size == 1) {
            uint256 owner1x1 = _owners[id];
            return (owner1x1 & BURNED_FLAG) == BURNED_FLAG ? address(0) : _ownerOfQuad(_owners, size, x, y);
        }
        return _ownerOfQuad(_owners, size, x, y);
    }

    function _getQuadById(uint256 id)
    private
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


    /**
     * @dev recursivly checks if the child quads are minted in land and push them to the quadMinted array.
     * if a child quad is minted in land such quads child quads will be skipped such that there is no overlapping
     * in quads which are minted. it clears the minted child quads owners.
     * @param land the stuct which has the size x and y co-ordinate of Quad to be checked
     * @param quadMinted array in which the minted child quad would be pushed
     * @param landMinted total 1x1 land already minted
     * @param index index of last element of quadMinted array
     * @param quadCompareSize the size of the child quads to be checked.
     * @return the index of last quad pushed in quadMinted array and the total land already minted
     */
    function _checkAndClearOwner(
        mapping(uint256 => uint256) storage _owners,
        Land memory land,
        Land[] memory quadMinted,
        uint256 landMinted,
        uint256 index,
        uint256 quadCompareSize
    ) private returns (uint256, uint256) {
        (uint256 layer, ,) = _getQuadLayer(quadCompareSize);
        uint256 toX = land.x + land.size;
        uint256 toY = land.y + land.size;

        //Lopping around the Quad in land struct to check if the child quad are minted or not
        for (uint256 xi = land.x; xi < toX; xi += quadCompareSize) {
            for (uint256 yi = land.y; yi < toY; yi += quadCompareSize) {
                // if child quad is not already in the quadMinted array.
                if (!_isQuadMinted(quadMinted, Land({x : xi, y : yi, size : quadCompareSize}), index)) {
                    uint256 id = _getQuadId(layer, xi, yi);
                    address owner = address(uint160(_owners[id]));
                    // owner of the child quad is checked to be owned by msg.sender else should not be owned by anyone.
                    if (owner == msg.sender) {
                        // if child quad is minted it would be pushed in quadMinted array.
                        quadMinted[index] = Land({x : xi, y : yi, size : quadCompareSize});
                        // index of quadMinted is increased
                        index++;
                        // total land minted is increase by the number if land of 1x1 in child quad
                        landMinted += quadCompareSize * quadCompareSize;
                        //owner is cleared
                        _owners[id] = 0;
                    } else {
                        require(owner == address(0), "Already minted");
                    }
                }
            }
        }

        // size of the child quad is set to be the next smaller child quad size (12 => 6 => 3)
        quadCompareSize = quadCompareSize / 2;
        // if child quad size is greater than 3 _checkAndClearOwner is checked for new child quads in the  quad in land struct.
        if (quadCompareSize >= 3)
            (index, landMinted) = _checkAndClearOwner(_owners, land, quadMinted, landMinted, index, quadCompareSize);
        return (index, landMinted);
    }

}
