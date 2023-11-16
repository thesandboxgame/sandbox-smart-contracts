// SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import {
IERC721ReceiverUpgradeable
} from "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721ReceiverUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import {IERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import {IERC721MandatoryTokenReceiver} from "../../../../common/interfaces/IERC721MandatoryTokenReceiver.sol";
import "./PolygonLandStorage.sol";

library PolygonLandImpl {
    using AddressUpgradeable for address;

    event Minter(address indexed minter, bool enabled);
    /**
     * @dev Emitted when `tokenId` token is transferred from `from` to `to`.
     */
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    /**
     * @dev Emitted when `owner` enables `approved` to manage the `tokenId` token.
     */
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    /**
     * @dev Emitted when `owner` enables or disables (`approved`) `operator` to manage all of its assets.
     */
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);


    struct Land {
        uint256 x;
        uint256 y;
        uint256 size;
    }

    bytes4 internal constant _ERC721_RECEIVED = 0x150b7a02;
    bytes4 internal constant _ERC721_BATCH_RECEIVED = 0x4b808c46;

    bytes4 internal constant ERC165ID = 0x01ffc9a7;
    bytes4 internal constant ERC721_MANDATORY_RECEIVER = 0x5e8bf644;

    uint256 internal constant NOT_ADDRESS = 0xFFFFFFFFFFFFFFFFFFFFFFFF0000000000000000000000000000000000000000;
    uint256 internal constant OPERATOR_FLAG = (2 ** 255);
    uint256 internal constant NOT_OPERATOR_FLAG = OPERATOR_FLAG - 1;
    uint256 internal constant BURNED_FLAG = (2 ** 160);


    uint256 internal constant GRID_SIZE = 408;

    uint256 internal constant LAYER = 0xFF00000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_1x1 = 0x0000000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_3x3 = 0x0100000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_6x6 = 0x0200000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_12x12 = 0x0300000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_24x24 = 0x0400000000000000000000000000000000000000000000000000000000000000;

    function batchTransferQuad(
        address msgSender,
        address from,
        address to,
        uint256[] calldata sizes,
        uint256[] calldata xs,
        uint256[] calldata ys,
        bytes calldata data
    ) public {
        PolygonLandStorage.LandStorage storage $ = PolygonLandStorage._getStorage();
        require(from != address(0), "from is zero address");
        require(to != address(0), "can't send to zero address");
        require(sizes.length == xs.length, "PolygonLandBaseTokenV2: sizes's and x's length are different");
        require(xs.length == ys.length, "PolygonLandBaseTokenV2: x's and y's length are different");
        if (msgSender != from) {
            require(
                $._operatorsForAll[from][msgSender] || $._superOperators[msgSender],
                "not authorized to transferMultiQuads"
            );
        }
        uint256 numTokensTransfered = 0;
        for (uint256 i = 0; i < sizes.length; i++) {
            uint256 size = sizes[i];
            _transferQuad(from, to, size, xs[i], ys[i]);
            numTokensTransfered += size * size;
        }
        $._numNFTPerAddress[from] -= numTokensTransfered;
        $._numNFTPerAddress[to] += numTokensTransfered;

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
                _checkOnERC721BatchReceived(msgSender, from, to, ids, data),
                "erc721 batch transfer rejected by to"
            );
        }
    }
    /// @notice Enable or disable the ability of `minter` to transfer tokens of all (minter rights).
    /// @param minter address that will be given/removed minter right.
    /// @param enabled set whether the minter is enabled or disabled.
    function setMinter(address minter, bool enabled) public {
        PolygonLandStorage.LandStorage storage $ = PolygonLandStorage._getStorage();
        require(minter != address(0), "PolygonLand: Invalid address");
        $._minters[minter] = enabled;
        emit Minter(minter, enabled);
    }

    /// @notice transfer one quad (aligned to a quad tree with size 3, 6, 12 or 24 only)
    /// @param from current owner of the quad
    /// @param to destination
    /// @param size size of the quad
    /// @param x The top left x coordinate of the quad
    /// @param y The top left y coordinate of the quad
    /// @param data additional data for transfer
    function transferQuad(
        address msgSender,
        address from,
        address to,
        uint256 size,
        uint256 x,
        uint256 y,
        bytes calldata data
    ) public {
        PolygonLandStorage.LandStorage storage $ = PolygonLandStorage._getStorage();
        require(from != address(0), "from is zero address");
        require(to != address(0), "can't send to zero address");
        if (msgSender != from) {
            require(
                $._operatorsForAll[from][msgSender] || $._superOperators[msgSender],
                "not authorized to transferQuad"
            );
        }
        _transferQuad(from, to, size, x, y);
        $._numNFTPerAddress[from] -= size * size;
        $._numNFTPerAddress[to] += size * size;

        _checkBatchReceiverAcceptQuad(msgSender, from, to, size, x, y, data);
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
        address msgSender,
        address user,
        uint256 size,
        uint256 x,
        uint256 y,
        bytes memory data
    ) public {
        _isValidQuad(size, x, y);
        require(isMinter(msgSender), "!AUTHORIZED");
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
    ) public {
        PolygonLandStorage.LandStorage storage $ = PolygonLandStorage._getStorage();
        require(isMinter(msg.sender), "!AUTHORIZED");
        require(to != address(0), "to is zero address");

        if (exists(size, x, y)) {
            _transferQuad(msg.sender, to, size, x, y);
            $._numNFTPerAddress[msg.sender] -= size * size;
            $._numNFTPerAddress[to] += size * size;
            _checkBatchReceiverAcceptQuad(msg.sender, msg.sender, to, size, x, y, data);
        } else {
            _mintAndTransferQuad(to, size, x, y, data);
        }
    }

    /// @notice x coordinate of Land token
    /// @param id tokenId
    /// @return the x coordinates
    function getX(uint256 id) public pure returns (uint256) {
        return _getX(id);
    }

    /// @notice y coordinate of Land token
    /// @param id tokenId
    /// @return the y coordinates
    function getY(uint256 id) public pure returns (uint256) {
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
    function supportsInterface(bytes4 id) public pure returns (bool) {
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
        PolygonLandStorage.LandStorage storage $ = PolygonLandStorage._getStorage();
        return $._minters[who];
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
        _isValidQuad(size, x, y);
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

    function _isValidQuad(
        uint256 size,
        uint256 x,
        uint256 y
    ) internal pure {
        require(size == 1 || size == 3 || size == 6 || size == 12 || size == 24, "Invalid size");
        require(x % size == 0, "Invalid x coordinate");
        require(y % size == 0, "Invalid y coordinate");
        require(x <= GRID_SIZE - size, "x out of bounds");
        require(y <= GRID_SIZE - size, "y out of bounds");
    }

    function _transferQuad(
        address from,
        address to,
        uint256 size,
        uint256 x,
        uint256 y
    ) internal {
        PolygonLandStorage.LandStorage storage $ = PolygonLandStorage._getStorage();
        _isValidQuad(size, x, y);
        if (size == 1) {
            uint256 id1x1 = _getQuadId(LAYER_1x1, x, y);
            address owner = _ownerOf(id1x1);
            require(owner != address(0), "token does not exist");
            require(owner == from, "not owner in _transferQuad");
            $._owners[id1x1] = uint256(uint160(address(to)));
        } else {
            _regroupQuad(from, to, Land({x : x, y : y, size : size}), true, size / 2);
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
        PolygonLandStorage.LandStorage storage $ = PolygonLandStorage._getStorage();
        require(to != address(0), "to is zero address");

        (uint256 layer, ,) = _getQuadLayer(size);
        uint256 quadId = _getQuadId(layer, x, y);

        _checkOwner(size, x, y, 24);
        for (uint256 i = 0; i < size * size; i++) {
            uint256 _id = _idInPath(i, size, x, y);
            require($._owners[_id] == 0, "Already minted");
            emit Transfer(address(0), to, _id);
        }

        $._owners[quadId] = uint256(uint160(to));
        $._numNFTPerAddress[to] += size * size;

        _checkBatchReceiverAcceptQuad(msg.sender, address(0), to, size, x, y, data);
    }

    /**
     * @dev checks if the child quads in the parent quad (size, x, y) are owned by msg.sender.
     * It recursively checks child quad of every size(exculding Lands of 1x1 size) are minted or not.
     * Quad which are minted are pushed into quadMinted to also check if every Land of size 1x1 in
     * the parent quad is minted or not. While checking if the every child Quad and Land is minted it
     * also checks and clear the owner for quads which are minted. Finally it checks if the new owner
     * if is a contract can handle ERC721 tokens or not and transfers the parent quad to new owner.
     * @param to The address to which the ownership of the quad will be transferred
     * @param size The size of the quad being minted and transfered
     * @param x The x-coordinate of the top-left corner of the quad being minted.
     * @param y The y-coordinate of the top-left corner of the quad being minted.
     * @param y The y-coordinate of the top-left corner of the quad being minted.
     */
    function _mintAndTransferQuad(
        address to,
        uint256 size,
        uint256 x,
        uint256 y,
        bytes memory data
    ) internal {
        PolygonLandStorage.LandStorage storage $ = PolygonLandStorage._getStorage();
        (uint256 layer, ,) = _getQuadLayer(size);
        uint256 quadId = _getQuadId(layer, x, y);

        // Length of array is equal to number of 3x3 child quad a 24x24 quad can have. Would be used to push the minted Quads.
        Land[] memory quadMinted = new Land[](64);
        // index of last minted quad pushed on quadMinted Array
        uint256 index;
        uint256 landMinted;

        // if size of the Quad in land struct to be transfered is greater than 3 we check recursivly if the child quads are minted or not.
        if (size > 3) {
            (index, landMinted) = _checkAndClearOwner(
                Land({x : x, y : y, size : size}),
                quadMinted,
                landMinted,
                index,
                size / 2
            );
        }

        // Lopping around the Quad in land struct to generate ids of 1x1 land token and checking if they are owned by msg.sender
        {
            for (uint256 i = 0; i < size * size; i++) {
                uint256 _id = _idInPath(i, size, x, y);
                // checking land with token id "_id" is in the quadMinted array.
                bool isAlreadyMinted = _isQuadMinted(quadMinted, Land({x : _getX(_id), y : _getY(_id), size : 1}), index);
                if (isAlreadyMinted) {
                    // if land is in the quadMinted array there just emitting transfer event
                    emit Transfer(msg.sender, to, _id);
                } else {
                    if (address(uint160($._owners[_id])) == msg.sender) {
                        if ($._operators[_id] != address(0)) $._operators[_id] = address(0);
                        landMinted += 1;
                        emit Transfer(msg.sender, to, _id);
                    } else {
                        // else is checked if owned by the msg.sender or not. If it is not owned by msg.sender it should not have an owner.
                        require($._owners[_id] == 0, "Already minted");

                        emit Transfer(address(0), to, _id);
                    }
                }
            }
        }

        // checks if to is a contract and supports ERC721_MANDATORY_RECEIVER interfaces. if it doesn't it just clears the owner of 1x1 lands in quad(size, x, y)
        if (to.isContract() && _checkInterfaceWith10000Gas(to, ERC721_MANDATORY_RECEIVER)) {
            // checking if the new owner "to" is a contract. If yes, checking if it could handle ERC721 tokens.
            (uint256[] memory idsToMint, uint256[] memory idsToTransfer) = _checkBatchReceiverAcceptQuadAndClearOwner(quadMinted, index, landMinted, size, x, y);
            // checking if "to" contact can handle ERC721 tokens
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
                if (address(uint160($._owners[id])) == msg.sender) $._owners[id] = 0;
            }
        }

        $._owners[quadId] = uint256(uint160(to));
        $._numNFTPerAddress[to] += size * size;
        $._numNFTPerAddress[msg.sender] -= landMinted;
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
        Land memory land,
        Land[] memory quadMinted,
        uint256 landMinted,
        uint256 index,
        uint256 quadCompareSize
    ) internal returns (uint256, uint256) {
        PolygonLandStorage.LandStorage storage $ = PolygonLandStorage._getStorage();
        (uint256 layer, ,) = _getQuadLayer(quadCompareSize);
        uint256 toX = land.x + land.size;
        uint256 toY = land.y + land.size;

        //Lopping around the Quad in land struct to check if the child quad are minted or not
        for (uint256 xi = land.x; xi < toX; xi += quadCompareSize) {
            for (uint256 yi = land.y; yi < toY; yi += quadCompareSize) {
                //checking if the child Quad is minted or not. i.e Checks if the quad is in the quadMinted array.
                bool isQuadChecked = _isQuadMinted(quadMinted, Land({x : xi, y : yi, size : quadCompareSize}), index);
                // if child quad is not already in the quadMinted array.
                if (!isQuadChecked) {
                    uint256 id = _getQuadId(layer, xi, yi);
                    address owner = address(uint160($._owners[id]));
                    // owner of the child quad is checked to be owned by msg.sender else should not be owned by anyone.
                    if (owner == msg.sender) {
                        // if child quad is minted it would be pushed in quadMinted array.
                        quadMinted[index] = Land({x : xi, y : yi, size : quadCompareSize});
                        // index of quadMinted is increased
                        index++;
                        // total land minted is increase by the number if land of 1x1 in child quad
                        landMinted += quadCompareSize * quadCompareSize;
                        //owner is cleared
                        $._owners[id] = 0;
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
            (index, landMinted) = _checkAndClearOwner(land, quadMinted, landMinted, index, quadCompareSize);
        return (index, landMinted);
    }

    /// @dev checks the owner of land with 'tokenId' to be 'from' and clears it
    /// @param from the address to be checked agains the owner of the land
    /// @param tokenId th id of land
    /// @return bool for if land is owned by 'from' or not.
    function _checkAndClearLandOwner(address from, uint256 tokenId) internal returns (bool) {
        PolygonLandStorage.LandStorage storage $ = PolygonLandStorage._getStorage();
        uint256 currentOwner = $._owners[tokenId];
        if (currentOwner != 0) {
            require((currentOwner & BURNED_FLAG) != BURNED_FLAG, "not owner");
            require(address(uint160(currentOwner)) == from, "not owner");
            $._owners[tokenId] = 0;
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
        uint256 size,
        uint256 x,
        uint256 y
    ) internal returns (uint256[] memory idsToMint, uint256[] memory idsToTransfer){
        PolygonLandStorage.LandStorage storage $ = PolygonLandStorage._getStorage();
        // array to push minted 1x1 land
        idsToTransfer = new uint256[](landMinted);
        // index of last land pushed in idsToTransfer array
        uint256 transferIndex;
        // array to push ids to be minted
        idsToMint = new uint256[]((size * size) - landMinted);
        // index of last land pushed in idsToMint array
        uint256 mintIndex;

        // iterating over every 1x1 land in the quad to be pushed in the above arrays
        for (uint256 i = 0; i < size * size; i++) {
            uint256 id = _idInPath(i, size, x, y);

            if (_isQuadMinted(quadMinted, Land({x : _getX(id), y : _getY(id), size : 1}), index)) {
                // if land is in the quads already minted it just pushed in to the idsToTransfer array
                idsToTransfer[transferIndex] = id;
                transferIndex++;
            } else if (address(uint160($._owners[id])) == msg.sender) {
                // if it is owned by the msg.sender owner data is removed and it is pused in to idsToTransfer array
                $._owners[id] = 0;
                idsToTransfer[transferIndex] = id;
                transferIndex++;
            } else {
                // else it is not owned by any one and and pushed in teh idsToMint array
                idsToMint[mintIndex] = id;
                mintIndex++;
            }
        }
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

    function _checkOwner(
        uint256 size,
        uint256 x,
        uint256 y,
        uint256 quadCompareSize
    ) internal view {
        PolygonLandStorage.LandStorage storage $ = PolygonLandStorage._getStorage();
        (uint256 layer, ,) = _getQuadLayer(quadCompareSize);

        if (size <= quadCompareSize) {
            // when the size of the quad is smaller than the quadCompareSize(size to be compared with),
            // then it is checked if the bigger quad which encapsulates the quad to be minted
            // of with size equals the quadCompareSize has been minted or not
            require(
                $._owners[
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
                    require($._owners[_getQuadId(layer, xi, yi)] == 0, "Already minted");
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
        PolygonLandStorage.LandStorage storage $ = PolygonLandStorage._getStorage();
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
                        ownAllIndividual = _checkAndClearLandOwner(from, _getQuadId(LAYER_1x1, xi, yi)) && ownerOfAll;
                        // ownerOfAll should be true if "from" is owner of all the child quads itereated over
                        ownerOfAll = ownAllIndividual && ownerOfAll;
                    } else {
                        // recursively calling the _regroupQuad function to check the owner of child quads.
                        ownAllIndividual = _regroupQuad(
                            from,
                            to,
                            Land({x : xi, y : yi, size : childQuadSize}),
                            false,
                            childQuadSize / 2
                        );
                        uint256 idChild = _getQuadId(childLayer, xi, yi);
                        uint256 ownerChild = $._owners[idChild];
                        if (ownerChild != 0) {
                            // checking the owner of child quad
                            if (!ownAllIndividual) {
                                require(ownerChild == uint256(uint160(from)), "not owner of child Quad");
                            }
                            // clearing owner of child quad
                            $._owners[idChild] = 0;
                        }
                        // ownerOfAll should be true if "from" is owner of all the child quads itereated over
                        ownerOfAll = (ownAllIndividual || ownerChild != 0) && ownerOfAll;
                    }
                }
            }
        }

        // if set is true it check if the "from" is owner of all else checks for the owner of parent quad is
        // owned by "from" and sets the owner for the id of land to "to" address.
        if (set) {
            if (!ownerOfAll) {
                require(_ownerOfQuad(land.size, land.x, land.y) == from, "not owner of all sub quads nor parent quads");
            }
            $._owners[quadId] = uint256(uint160(to));
            return true;
        }

        return ownerOfAll;
    }

    function _ownerOfQuad(
        uint256 size,
        uint256 x,
        uint256 y
    ) internal view returns (address) {
        PolygonLandStorage.LandStorage storage $ = PolygonLandStorage._getStorage();
        (uint256 layer, uint256 parentSize,) = _getQuadLayer(size);
        address owner = address(uint160($._owners[_getQuadId(layer, (x / size) * size, (y / size) * size)]));
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

    function _ownerOf(uint256 id) internal view returns (address) {
        PolygonLandStorage.LandStorage storage $ = PolygonLandStorage._getStorage();
        require(id & LAYER == 0, "Invalid token id");
        (uint256 size, uint256 x, uint256 y) = _getQuadById(id);
        require(x % size == 0, "x coordinate: Invalid token id");
        require(y % size == 0, "y coordinate: Invalid token id");
        if (size == 1) {
            uint256 owner1x1 = $._owners[id];
            return (owner1x1 & BURNED_FLAG) == BURNED_FLAG ? address(0) : _ownerOfQuad(size, x, y);
        }
        return _ownerOfQuad(size, x, y);
    }

    function _ownerAndOperatorEnabledOf(uint256 id)
    internal
    view
    returns (address owner, bool operatorEnabled)
    {
        PolygonLandStorage.LandStorage storage $ = PolygonLandStorage._getStorage();
        require(id & LAYER == 0, "Invalid token id");
        uint256 x = id % GRID_SIZE;
        uint256 y = id / GRID_SIZE;
        uint256 owner1x1 = $._owners[id];

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
    ////////////////////////////////////////////////////////////////////////////////////////////
    /// @notice Approve an operator to spend tokens on the senders behalf.
    /// @param operator The address receiving the approval.
    /// @param id The id of the token.
    function approve(address msgSender, address operator, uint256 id) public {
        PolygonLandStorage.LandStorage storage $ = PolygonLandStorage._getStorage();
        uint256 ownerData = $._owners[_storageId(id)];
        address owner = _ownerOf(id);
        require(owner != address(0), "NONEXISTENT_TOKEN");
        require(
            owner == msgSender || $._operatorsForAll[owner][msgSender] || $._superOperators[msgSender],
            "UNAUTHORIZED_APPROVAL"
        );
        _approveFor(ownerData, operator, id);
    }

    /// @notice Approve an operator to spend tokens on the sender behalf.
    /// @param sender The address giving the approval.
    /// @param operator The address receiving the approval.
    /// @param id The id of the token.
    function approveFor(
        address msgSender, address sender,
        address operator,
        uint256 id
    ) public {
        PolygonLandStorage.LandStorage storage $ = PolygonLandStorage._getStorage();
        uint256 ownerData = $._owners[_storageId(id)];
        address owner = _ownerOf(id);
        require(sender != address(0), "ZERO_ADDRESS_SENDER");
        require(owner != address(0), "NONEXISTENT_TOKEN");
        require(
            msgSender == sender || $._operatorsForAll[sender][msgSender] || $._superOperators[msgSender],
            "UNAUTHORIZED_APPROVAL"
        );
        require(address(uint160(ownerData)) == sender, "OWNER_NOT_SENDER");
        _approveFor(ownerData, operator, id);
    }

    /// @notice Transfer a token between 2 addresses.
    /// @param from The sender of the token.
    /// @param to The recipient of the token.
    /// @param id The id of the token.
    function transferFrom(
        address msgSender,
        address from,
        address to,
        uint256 id
    ) public {
        _checkTransfer(msgSender, from, to, id);
        _transferFrom(from, to, id);
        if (to.isContract() && _checkInterfaceWith10000Gas(to, ERC721_MANDATORY_RECEIVER)) {
            require(_checkOnERC721Received(msgSender, from, to, id, ""), "ERC721_TRANSFER_REJECTED");
        }
    }
    /// @dev By overriding this function in an implementation which inherits this contract,
    /// you can enable versioned tokenIds without the extra overhead of writing to a new storage slot in _owners each time a version is incremented.
    /// See GameToken._storageId() for an example, where the storageId is the tokenId minus the version number.
    /// !!! Caution !!! Overriding this function without taking appropriate care could lead to
    /// ownerOf() returning an owner for non-existent tokens. Tests should be written to
    /// guard against introducing this bug.
    /// @param id The id of a token.
    /// @return The id used for storage mappings.
    function _storageId(uint256 id) internal pure returns (uint256) {
        return id;
    }

    function _updateOwnerData(
        uint256 id,
        uint256 oldData,
        address newOwner,
        bool hasOperator
    ) internal {
        PolygonLandStorage.LandStorage storage $ = PolygonLandStorage._getStorage();
        if (hasOperator) {
            $._owners[_storageId(id)] = (oldData & NOT_ADDRESS) | OPERATOR_FLAG | uint256(uint160(newOwner));
        } else {
            $._owners[_storageId(id)] = ((oldData & NOT_ADDRESS) & NOT_OPERATOR_FLAG) | uint256(uint160(newOwner));
        }
    }

    function _transferFrom(
        address from,
        address to,
        uint256 id
    ) internal {
        PolygonLandStorage.LandStorage storage $ = PolygonLandStorage._getStorage();
        $._numNFTPerAddress[from]--;
        $._numNFTPerAddress[to]++;
        _updateOwnerData(id, $._owners[_storageId(id)], to, false);
        emit Transfer(from, to, id);
    }

    /// @dev See approveFor.
    function _approveFor(
        uint256 ownerData,
        address operator,
        uint256 id
    ) internal {
        PolygonLandStorage.LandStorage storage $ = PolygonLandStorage._getStorage();
        address owner = _ownerOf(id);
        if (operator == address(0)) {
            _updateOwnerData(id, ownerData, owner, false);
        } else {
            _updateOwnerData(id, ownerData, owner, true);
            $._operators[id] = operator;
        }
        emit Approval(owner, operator, id);
    }

    /// @dev See batchTransferFrom.
    function batchTransferFrom(
        address msgSender,
        address from,
        address to,
        uint256[] memory ids,
        bytes memory data,
        bool safe
    ) public {
        PolygonLandStorage.LandStorage storage $ = PolygonLandStorage._getStorage();
        bool authorized = msgSender == from || $._operatorsForAll[from][msgSender] || $._superOperators[msgSender];

        require(from != address(0), "NOT_FROM_ZEROADDRESS");
        require(to != address(0), "NOT_TO_ZEROADDRESS");

        uint256 numTokens = ids.length;
        for (uint256 i = 0; i < numTokens; i++) {
            uint256 id = ids[i];
            (address owner, bool operatorEnabled) = _ownerAndOperatorEnabledOf(id);
            require(owner == from, "BATCHTRANSFERFROM_NOT_OWNER");
            require(authorized || (operatorEnabled && $._operators[id] == msgSender), "NOT_AUTHORIZED");
            _updateOwnerData(id, $._owners[_storageId(id)], to, false);
            emit Transfer(from, to, id);
        }
        if (from != to) {
            $._numNFTPerAddress[from] -= numTokens;
            $._numNFTPerAddress[to] += numTokens;
        }

        if (to.isContract()) {
            if (_checkInterfaceWith10000Gas(to, ERC721_MANDATORY_RECEIVER)) {
                require(_checkOnERC721BatchReceived(msgSender, from, to, ids, data), "ERC721_BATCH_RECEIVED_REJECTED");
            } else if (safe) {
                for (uint256 i = 0; i < numTokens; i++) {
                    require(_checkOnERC721Received(msgSender, from, to, ids[i], data), "ERC721_RECEIVED_REJECTED");
                }
            }
        }
    }

    /// @dev See setApprovalForAll.
    function setApprovalForAll(
        address sender,
        address operator,
        bool approved
    ) public {
        PolygonLandStorage.LandStorage storage $ = PolygonLandStorage._getStorage();
        require(!$._superOperators[operator], "INVALID_APPROVAL_CHANGE");
        $._operatorsForAll[sender][operator] = approved;

        emit ApprovalForAll(sender, operator, approved);
    }

    /// @dev See burn.
    function _burn(
        address from,
        address owner,
        uint256 id
    ) internal {
        PolygonLandStorage.LandStorage storage $ = PolygonLandStorage._getStorage();
        require(from == owner, "NOT_OWNER");
        uint256 storageId = _storageId(id);
        $._owners[storageId] = ($._owners[storageId] & NOT_OPERATOR_FLAG) | BURNED_FLAG;
        // record as non owner but keep track of last owner
        $._numNFTPerAddress[from]--;
        emit Transfer(from, address(0), id);
    }

    function burn(
        address from,
        address owner,
        uint256 id
    ) public {
        _burn(from, owner, id);
    }

    /// @notice Burn token `id` from `from`.
    /// @param from address whose token is to be burnt.
    /// @param id The token which will be burnt.
    function burnFrom(address msgSender, address from, uint256 id) public {
        PolygonLandStorage.LandStorage storage $ = PolygonLandStorage._getStorage();
        require(from != address(0), "NOT_FROM_ZEROADDRESS");
        (address owner, bool operatorEnabled) = _ownerAndOperatorEnabledOf(id);
        require(
            msgSender == from ||
            (operatorEnabled && $._operators[id] == msgSender) ||
            $._superOperators[msgSender] ||
            $._operatorsForAll[from][msgSender],
            "UNAUTHORIZED_BURN"
        );
        _burn(from, owner, id);
    }

    /// @notice Get the owner of a token.
    /// @param id The id of the token.
    /// @return owner The address of the token owner.
    function ownerOf(uint256 id) public view returns (address owner) {
        owner = _ownerOf(id);
        require(owner != address(0), "NONEXISTANT_TOKEN");
    }

    /// @notice Get the approved operator for a specific token.
    /// @param id The id of the token.
    /// @return The address of the operator.
    function getApproved(uint256 id) public view returns (address) {
        PolygonLandStorage.LandStorage storage $ = PolygonLandStorage._getStorage();
        (address owner, bool operatorEnabled) = _ownerAndOperatorEnabledOf(id);
        require(owner != address(0), "NONEXISTENT_TOKEN");
        if (operatorEnabled) {
            return $._operators[id];
        } else {
            return address(0);
        }
    }

    function safeTransferFrom(
        address msgSender,
        address from,
        address to,
        uint256 id,
        bytes memory data
    ) public {
        _checkTransfer(msgSender, from, to, id);
        _transferFrom(from, to, id);
        if (to.isContract()) {
            require(_checkOnERC721Received(msgSender, from, to, id, data), "ERC721_TRANSFER_REJECTED");
        }
    }

    /// @dev Check if receiving contract accepts erc721 transfers.
    /// @param operator The address of the operator.
    /// @param from The from address, may be different from msg.sender.
    /// @param to The address we want to transfer to.
    /// @param tokenId The id of the token we would like to transfer.
    /// @param _data Any additional data to send with the transfer.
    /// @return Whether the expected value of 0x150b7a02 is returned.
    function _checkOnERC721Received(
        address operator,
        address from,
        address to,
        uint256 tokenId,
        bytes memory _data
    ) internal returns (bool) {
        bytes4 retval = IERC721ReceiverUpgradeable(to).onERC721Received(operator, from, tokenId, _data);
        return (retval == _ERC721_RECEIVED);
    }

    /// @dev Check if receiving contract accepts erc721 batch transfers.
    /// @param operator The address of the operator.
    /// @param from The from address, may be different from msg.sender.
    /// @param to The address we want to transfer to.
    /// @param ids The ids of the tokens we would like to transfer.
    /// @param _data Any additional data to send with the transfer.
    /// @return Whether the expected value of 0x4b808c46 is returned.
    function _checkOnERC721BatchReceived(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        bytes memory _data
    ) internal returns (bool) {
        bytes4 retval = IERC721MandatoryTokenReceiver(to).onERC721BatchReceived(operator, from, ids, _data);
        return (retval == _ERC721_BATCH_RECEIVED);
    }

    /// @dev Check whether a transfer is a meta Transaction or not.
    /// @param from The address who initiated the transfer (may differ from msg.sender).
    /// @param to The address receiving the token.
    /// @param id The token being transferred.
    function _checkTransfer(
        address msgSender,
        address from,
        address to,
        uint256 id
    ) internal view {
        PolygonLandStorage.LandStorage storage $ = PolygonLandStorage._getStorage();
        (address owner, bool operatorEnabled) = _ownerAndOperatorEnabledOf(id);
        require(owner != address(0), "NONEXISTENT_TOKEN");
        require(owner == from, "CHECKTRANSFER_NOT_OWNER");
        require(to != address(0), "NOT_TO_ZEROADDRESS");
        require(
            msgSender == owner ||
            $._superOperators[msgSender] ||
            $._operatorsForAll[from][msgSender] ||
            (operatorEnabled && $._operators[id] == msgSender),
            "UNAUTHORIZED_TRANSFER"
        );
    }

    /// @dev Check if there was enough gas.
    /// @param _contract The address of the contract to check.
    /// @param interfaceId The id of the interface we want to test.
    /// @return Whether or not this check succeeded.
    function _checkInterfaceWith10000Gas(address _contract, bytes4 interfaceId) internal view returns (bool) {
        bool success;
        bool result;
        bytes memory callData = abi.encodeWithSelector(ERC165ID, interfaceId);
        // solhint-disable-next-line no-inline-assembly
        assembly {
            let call_ptr := add(0x20, callData)
            let call_size := mload(callData)
            let output := mload(0x40) // Find empty storage location using "free memory pointer"
            mstore(output, 0x0)
            success := staticcall(10000, _contract, call_ptr, call_size, output, 0x20) // 32 bytes
            result := mload(output)
        }
        // (10000 / 63) "not enough for supportsInterface(...)" // consume all gas, so caller can potentially know that there was not enough gas
        assert(gasleft() > 158);
        return success && result;
    }
}

