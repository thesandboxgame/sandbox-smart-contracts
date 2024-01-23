// SPDX-License-Identifier: MIT
/* solhint-disable func-order, code-complexity */
pragma solidity 0.8.23;

import {AddressUtils} from "./AddressUtils.sol";
import {ERC721BaseTokenV2} from "./ERC721BaseTokenV2.sol";

/**
 * @title LandBaseTokenV3
 * @author The Sandbox
 * @notice Implement LAND and quad functionalities on top of an ERC721 token
 * @dev This contract implements a quad tree structure to handle groups of ERC721 tokens at once
 */
contract LandBaseTokenV3 is ERC721BaseTokenV2 {
    using AddressUtils for address;
    // Our grid is 408 x 408 lands
    uint256 internal constant GRID_SIZE = 408;

    /* solhint-disable const-name-snakecase */
    uint256 internal constant LAYER = 0xFF00000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_1x1 = 0x0000000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_3x3 = 0x0100000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_6x6 = 0x0200000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_12x12 = 0x0300000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_24x24 = 0x0400000000000000000000000000000000000000000000000000000000000000;
    /* solhint-enable const-name-snakecase */

    mapping(address => bool) internal _minters;
    event Minter(address indexed superOperator, bool enabled);

    struct Land {
        uint256 x;
        uint256 y;
        uint256 size;
    }

    /**
     * @notice Mint a new quad (aligned to a quad tree with size 1, 3, 6, 12 or 24 only)
     * @param to The recipient of the new quad
     * @param size The size of the new quad
     * @param x The top left x coordinate of the new quad
     * @param y The top left y coordinate of the new quad
     * @param data extra data to pass to the transfer
     */
    function mintQuad(address to, uint256 size, uint256 x, uint256 y, bytes calldata data) external {
        require(to != address(0), "to is zero address");
        require(size != 0, "size cannot be zero");
        require(isMinter(msg.sender), "Only a minter can mint");

        _isValidQuad(size, x, y);

        (uint256 layer, , ) = _getQuadLayer(size);
        uint256 quadId = _getQuadId(layer, x, y);

        _checkOwner(size, x, y, 24);
        for (uint256 i = 0; i < size * size; i++) {
            uint256 _id = _idInPath(i, size, x, y);
            require(_owners[_id] == 0, "Already minted");
            emit Transfer(address(0), to, _id);
        }

        _owners[quadId] = uint160(to);
        _numNFTPerAddress[to] += size * size;

        _checkBatchReceiverAcceptQuad(msg.sender, address(0), to, size, x, y, data);
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
    function mintAndTransferQuad(address to, uint256 size, uint256 x, uint256 y, bytes calldata data) external {
        require(to != address(0), "to is zero address");
        require(isMinter(msg.sender), "Only a minter can mint");

        if (exists(size, x, y) == true) {
            _transferQuad(msg.sender, to, size, x, y);
            _numNFTPerAddress[msg.sender] -= size * size;
            _numNFTPerAddress[to] += size * size;
            _checkBatchReceiverAcceptQuad(msg.sender, msg.sender, to, size, x, y, data);
        } else {
            _mintAndTransferQuad(to, size, x, y, data);
        }
    }

    /// @notice transfer one quad (aligned to a quad tree with size 3, 6, 12 or 24 only)
    /// @param from current owner of the quad
    /// @param to destination
    /// @param size size of the quad
    /// @param x The top left x coordinate of the quad
    /// @param y The top left y coordinate of the quad
    /// @param data additional data
    function transferQuad(address from, address to, uint256 size, uint256 x, uint256 y, bytes calldata data) external {
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
        require(sizes.length == xs.length, "sizes's and x's are different");
        require(xs.length == ys.length, "x's and y's are different");
        bool metaTx = msg.sender != from && _metaTransactionContracts[msg.sender];
        if (msg.sender != from && !metaTx) {
            require(_operatorsForAll[from][msg.sender] || _superOperators[msg.sender], "not authorized");
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
                "erc721 batchTransfer rejected"
            );
        }
    }

    /// @notice Enable or disable the ability of `minter` to mint tokens
    /// @param minter address that will be given/removed minter right.
    /// @param enabled set whether the minter is enabled or disabled.
    function setMinter(address minter, bool enabled) external onlyAdmin {
        require(minter != address(0), "address 0 is not allowed");
        require(enabled != _minters[minter], "the status should be different");
        _minters[minter] = enabled;
        emit Minter(minter, enabled);
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
    function getX(uint256 id) external pure returns (uint256) {
        return _getX(id);
    }

    /// @notice y coordinate of Land token
    /// @param id tokenId
    /// @return the y coordinates
    function getY(uint256 id) external pure returns (uint256) {
        return _getY(id);
    }

    /// @notice check whether address `who` is given minter rights.
    /// @param who The address to query.
    /// @return whether the address has minter rights.
    function isMinter(address who) public view returns (bool) {
        return _minters[who];
    }

    /// @notice checks if Land has been minted or not
    /// @param size size of the quad
    /// @param x x coordinate of the quad
    /// @param y y coordinate of the quad
    /// @return bool for if Land has been minted or not
    function exists(uint256 size, uint256 x, uint256 y) public view returns (bool) {
        _isValidQuad(size, x, y);
        return _ownerOfQuad(size, x, y) != address(0);
    }

    function _isValidQuad(uint256 size, uint256 x, uint256 y) internal pure {
        require(size == 1 || size == 3 || size == 6 || size == 12 || size == 24, "Invalid size");
        require(x % size == 0, "Invalid x coordinate");
        require(y % size == 0, "Invalid y coordinate");
        require(x <= GRID_SIZE - size, "x out of bounds");
        require(y <= GRID_SIZE - size, "y out of bounds");
    }

    /**
     * @dev checks if the child quads in the parent quad (size, x, y) are owned by msg.sender.
     * It recursively checks child quad of every size(exculding Lands of 1x1 size) are minted or not.
     * Quad which are minted are pushed into quadMinted to also check if every Land of size 1x1 in the parent quad is minted or not.
     * While checking if the every child Quad and Land is minted it also checks and clear the owner for quads which are minted.
     * Finally it checks if the new owner if is a contract can handle ERC721 tokens or not and transfers the parent quad to new owner.
     * @param to The address to which the ownership of the quad will be transferred
     * @param size The size of the quad being minted and transfered
     * @param x The x-coordinate of the top-left corner of the quad being minted.
     * @param y The y-coordinate of the top-left corner of the quad being minted.
     * @param data extra data to pass to the transfer
     */
    function _mintAndTransferQuad(address to, uint256 size, uint256 x, uint256 y, bytes memory data) internal {
        (uint256 layer, , ) = _getQuadLayer(size);
        uint256 quadId = _getQuadId(layer, x, y);

        // Length of array is equal to number of 3x3 child quad a 24x24 quad can have. Would be used to push the minted Quads.
        Land[] memory quadMinted = new Land[](64);
        // index of last minted quad pushed on quadMinted Array
        uint256 index;
        uint256 numLandMinted;

        // if size of the Quad in land struct to be transfered is greater than 3 we check recursivly if the child quads are minted or not.
        if (size > 3) {
            (index, numLandMinted) = _checkAndClearOwner(
                Land({x: x, y: y, size: size}),
                quadMinted,
                numLandMinted,
                index,
                size / 2
            );
        }

        // Lopping around the Quad in land struct to generate ids of 1x1 land token and checking if they are owned by msg.sender
        {
            for (uint256 i = 0; i < size * size; i++) {
                uint256 _id = _idInPath(i, size, x, y);
                // checking land with token id "_id" is in the quadMinted array.
                bool isAlreadyMinted = _isQuadMinted(quadMinted, Land({x: _getX(_id), y: _getY(_id), size: 1}), index);
                if (isAlreadyMinted) {
                    // if land is in the quadMinted array there just emitting transfer event.
                    emit Transfer(msg.sender, to, _id);
                } else {
                    if (address(uint160(_owners[_id])) == msg.sender) {
                        if (_operators[_id] != address(0)) _operators[_id] = address(0);
                        numLandMinted += 1;
                        emit Transfer(msg.sender, to, _id);
                    } else {
                        // else is checked if owned by the msg.sender or not. If it is not owned by msg.sender it should not have an owner.
                        require(_owners[_id] == 0, "Already minted");

                        emit Transfer(address(0), to, _id);
                    }
                }
            }
        }

        // checking if the new owner "to" is a contract. If yes, checking if it could handle ERC721 tokens.
        _checkBatchReceiverAcceptQuadAndClearOwner(quadMinted, index, numLandMinted, to, size, x, y, data);

        _owners[quadId] = uint160(to);
        _numNFTPerAddress[to] += size * size;
        _numNFTPerAddress[msg.sender] -= numLandMinted;
    }

    /// @param operator sender of the tx
    /// @param from owner of the token
    /// @param to recipient
    /// @param size The size of the new quad
    /// @param x The top left x coordinate of the new quad
    /// @param y The top left y coordinate of the new quad
    /// @param data extra data
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
            require(_checkOnERC721BatchReceived(operator, from, to, ids, data), "erc721 batchTransfer rejected");
        }
    }

    /// @dev checks if the receiver of the quad(size, x, y) is a contact. If yes can it handle ERC721 tokens.
    ///      It also clears owner of 1x1 land's owned by msg.sender.
    /// @param quadMinted array of lands
    /// @param index array size
    /// @param numLandMinted number of lands transferred
    /// @param to recipient
    /// @param size The size of the new quad
    /// @param x The top left x coordinate of the new quad
    /// @param y The top left y coordinate of the new quad
    /// @param data extra data
    function _checkBatchReceiverAcceptQuadAndClearOwner(
        Land[] memory quadMinted,
        uint256 index,
        uint256 numLandMinted,
        address to,
        uint256 size,
        uint256 x,
        uint256 y,
        bytes memory data
    ) internal {
        // checks if to is a contract and supports ERC721_MANDATORY_RECEIVER interfaces.
        // if it doesn't it just clears the owner of 1x1 lands in quad(size, x, y)
        if (to.isContract() && _checkInterfaceWith10000Gas(to, ERC721_MANDATORY_RECEIVER)) {
            // array to push minted 1x1 land
            uint256[] memory idsToTransfer = new uint256[](numLandMinted);
            // index of last land pushed in idsToTransfer array
            uint256 transferIndex;
            // array to push ids to be minted
            uint256[] memory idsToMint = new uint256[]((size * size) - numLandMinted);
            // index of last land pushed in idsToMint array
            uint256 mintIndex;
            // iterating over every 1x1 land in the quad to be pushed in the above arrays
            for (uint256 i = 0; i < size * size; i++) {
                uint256 id = _idInPath(i, size, x, y);

                if (_isQuadMinted(quadMinted, Land({x: _getX(id), y: _getY(id), size: 1}), index)) {
                    // if land is in the quads already minted it just pushed in to the idsToTransfer array
                    idsToTransfer[transferIndex] = id;
                    transferIndex++;
                } else if (address(uint160(_owners[id])) == msg.sender) {
                    _owners[id] = 0;
                    idsToTransfer[transferIndex] = id;
                    transferIndex++;
                } else {
                    // else it is not owned by any one and and pushed in teh idsToMint array
                    idsToMint[mintIndex] = id;
                    mintIndex++;
                }
            }

            // checking if "to" contact can handle ERC721 tokens
            require(
                _checkOnERC721BatchReceived(msg.sender, address(0), to, idsToMint, data),
                "erc721 batchTransfer rejected"
            );
            require(
                _checkOnERC721BatchReceived(msg.sender, msg.sender, to, idsToTransfer, data),
                "erc721 batchTransfer rejected"
            );
        } else {
            for (uint256 i = 0; i < size * size; i++) {
                uint256 id = _idInPath(i, size, x, y);
                if (address(uint160(_owners[id])) == msg.sender) _owners[id] = 0;
            }
        }
    }

    /// @param from current owner of the quad
    /// @param to destination
    /// @param size size of the quad
    /// @param x The top left x coordinate of the quad
    /// @param y The top left y coordinate of the quad
    function _transferQuad(address from, address to, uint256 size, uint256 x, uint256 y) internal {
        _isValidQuad(size, x, y);
        if (size == 1) {
            uint256 id1x1 = _getQuadId(LAYER_1x1, x, y);
            address owner = _ownerOf(id1x1);
            require(owner != address(0), "token does not exist");
            require(owner == from, "not owner");
            _owners[id1x1] = uint160(to);
        } else {
            _regroupQuad(from, to, Land({x: x, y: y, size: size}), true, size / 2);
        }
        for (uint256 i = 0; i < size * size; i++) {
            emit Transfer(from, to, _idInPath(i, size, x, y));
        }
    }

    /// @dev checks if the quad is already minted compared to another quad size
    /// @param size size of the quad
    /// @param x The top left x coordinate of the quad
    /// @param y The top left y coordinate of the quad
    /// @param quadCompareSize size to compare with
    function _checkOwner(uint256 size, uint256 x, uint256 y, uint256 quadCompareSize) internal view {
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
            // when the size is bigger than the quadCompare size the owner of all the smaller quads with size
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

    /// @dev checks the owner of land of token id 'id' to be 'from' and clears it
    /// @param from owner of the token
    /// @param tokenId token id
    /// @return if the address is the owner of the token
    function _checkAndClearLandOwner(address from, uint256 tokenId) internal returns (bool) {
        uint256 currentOwner = _owners[tokenId];
        if (currentOwner != 0) {
            require(address(uint160(currentOwner)) == from, "not owner");
            _owners[tokenId] = 0;
            return true;
        }
        return false;
    }

    /** @dev recursivly checks if the child quads are minted in land and push them to the quadMinted array.
     * if a child quad is minted in land such quads child quads will be skipped such that there is no
     * overlapping in quads which are minted. it clears the minted child quads owners.
     * @param land the stuct which has the size x and y co-ordinate of Quad to be checked
     * @param quadMinted array in which the minted child quad would be pushed
     * @param numLandMinted number of lands transferred
     * @param index index of last element of quadMinted array
     * @param quadCompareSize the size of the child quads to be checked.
     * @return the index of last quad pushed in quadMinted array and the total land already minted
     * @return the number of lands minted
     */
    function _checkAndClearOwner(
        Land memory land,
        Land[] memory quadMinted,
        uint256 numLandMinted,
        uint256 index,
        uint256 quadCompareSize
    ) internal returns (uint256, uint256) {
        (uint256 layer, , ) = _getQuadLayer(quadCompareSize);
        uint256 toX = land.x + land.size;
        uint256 toY = land.y + land.size;

        //Lopping around the Quad in land struct to check if the child quad are minted or not
        for (uint256 xi = land.x; xi < toX; xi += quadCompareSize) {
            for (uint256 yi = land.y; yi < toY; yi += quadCompareSize) {
                //checking if the child Quad is minted or not. i.e Checks if the quad is in the quadMinted array.
                bool isQuadChecked = _isQuadMinted(quadMinted, Land({x: xi, y: yi, size: quadCompareSize}), index);
                // if child quad is not already in the quadMinted array.
                if (!isQuadChecked) {
                    uint256 id = _getQuadId(layer, xi, yi);
                    address owner = address(uint160(_owners[id]));
                    // owner of the child quad is checked to be owned by msg.sender else should not be owned by anyone.
                    if (owner == msg.sender) {
                        // if child quad is minted it would be pushed in quadMinted array.
                        quadMinted[index] = Land({x: xi, y: yi, size: quadCompareSize});
                        // index of quadMinted is increased
                        index++;
                        // total land minted is increase by the number if land of 1x1 in child quad
                        numLandMinted += quadCompareSize * quadCompareSize;
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
            (index, numLandMinted) = _checkAndClearOwner(land, quadMinted, numLandMinted, index, quadCompareSize);
        return (index, numLandMinted);
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
            // double for loop iterates and checks owner of all the smaller quads in land
            for (uint256 xi = land.x; xi < land.x + land.size; xi += childQuadSize) {
                for (uint256 yi = land.y; yi < land.y + land.size; yi += childQuadSize) {
                    uint256 ownerChild;
                    bool ownAllIndividual;
                    if (childQuadSize < 3) {
                        // case when the smaller quad is 1x1,
                        ownAllIndividual = _checkAndClearLandOwner(from, _getQuadId(LAYER_1x1, xi, yi)) && ownerOfAll;
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
                            if (!ownAllIndividual) {
                                // checking the owner of child quad
                                require(ownerChild == uint160(from), "not owner of child Quad");
                            }
                            // clearing owner of child quad
                            _owners[idChild] = 0;
                        }
                    }
                    // ownerOfAll should be true if "from" is owner of all the child quads iterated over
                    ownerOfAll = (ownAllIndividual || ownerChild != 0) && ownerOfAll;
                }
            }
        }

        // if set is true it check if the "from" is owner of all else checks for the owner of parent quad is
        // owned by "from" and sets the owner for the id of land to "to" address.
        if (set) {
            if (!ownerOfAll) {
                require(_ownerOfQuad(land.size, land.x, land.y) == from, "not owner");
            }
            _owners[quadId] = uint160(to);
            return true;
        }

        return ownerOfAll;
    }

    /// @notice Goes through every token id of a quad id
    /// @param i ith token of the quad
    /// @param size size of the quad
    /// @param x The top left x coordinate of the quad
    /// @param y The top left y coordinate of the quad
    /// @return the "ith" token id of the quad
    function _idInPath(uint256 i, uint256 size, uint256 x, uint256 y) internal pure returns (uint256) {
        uint256 row = i / size;
        if (row % 2 == 0) {
            // allow ids to follow a path in a quad
            return _getQuadId(LAYER_1x1, (x + (i % size)), (y + row));
        } else {
            return _getQuadId(LAYER_1x1, (x + size) - (1 + (i % size)), (y + row));
        }
    }

    /// @param mintedLand array of lands
    /// @param quad quad to check
    /// @param index size of the array
    /// @return is the quad minted
    function _isQuadMinted(Land[] memory mintedLand, Land memory quad, uint256 index) internal pure returns (bool) {
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

    /// @param id token id
    /// @return the x coordinate
    function _getX(uint256 id) internal pure returns (uint256) {
        return (id & ~LAYER) % GRID_SIZE;
    }

    /// @param id token id
    /// @return the y coordinate
    function _getY(uint256 id) internal pure returns (uint256) {
        return (id & ~LAYER) / GRID_SIZE;
    }

    /// @param size of the quad
    /// @return layer the layer associated to that quad size
    /// @return parentSize size of the parent quad
    /// @return childLayer layer of the child quad size
    function _getQuadLayer(uint256 size) internal pure returns (uint256 layer, uint256 parentSize, uint256 childLayer) {
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

    /// @param layer of the quad size
    /// @param x coordinate of the quad
    /// @param y coordinate of the quad
    /// @return the quad id
    function _getQuadId(uint256 layer, uint256 x, uint256 y) internal pure returns (uint256) {
        return layer + x + y * GRID_SIZE;
    }

    /// @param size of the quad
    /// @param x coordinate of the quad
    /// @param y coordinate of the quad
    /// @return address of the owner of the quad
    function _ownerOfQuad(uint256 size, uint256 x, uint256 y) internal view returns (address) {
        (uint256 layer, uint256 parentSize, ) = _getQuadLayer(size);
        address owner = address(uint160(_owners[_getQuadId(layer, (x / size) * size, (y / size) * size)]));
        if (owner != address(0)) {
            return owner;
        } else if (size < 24) {
            return _ownerOfQuad(parentSize, x, y);
        }
        return address(0);
    }

    /// @param id quad id
    /// @return size of the quad
    /// @return x coordinate
    /// @return y coordinate
    function _getQuadById(uint256 id) internal pure returns (uint256 size, uint256 x, uint256 y) {
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

    /// @param id quad id
    /// @return address of the owner
    function _ownerOf(uint256 id) internal view override returns (address) {
        require(id & LAYER == 0, "Invalid token id");
        (uint256 size, uint256 x, uint256 y) = _getQuadById(id);
        require(x % size == 0, "x coordinate: Invalid token id");
        require(y % size == 0, "y coordinate: Invalid token id");
        return _ownerOfQuad(size, x, y);
    }

    /// @param id token id
    /// @return owner owner of the token
    /// @return operatorEnabled is operator enabled
    function _ownerAndOperatorEnabledOf(
        uint256 id
    ) internal view override returns (address owner, bool operatorEnabled) {
        require(id & LAYER == 0, "Invalid token id");
        uint256 x = _getX(id);
        uint256 y = _getY(id);
        uint256 owner1x1 = _owners[id];

        if (owner1x1 != 0) {
            owner = address(uint160(owner1x1));
            operatorEnabled = (owner1x1 / 2 ** 255) == 1;
        } else {
            owner = _ownerOfQuad(3, (x * 3) / 3, (y * 3) / 3);
            operatorEnabled = false;
        }
    }
}
