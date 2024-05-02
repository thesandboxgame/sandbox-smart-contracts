// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Metadata} from "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import {IErrors} from "../interfaces/IErrors.sol";
import {ILandToken} from "../interfaces/ILandToken.sol";
import {ERC721BaseToken} from "../common/ERC721BaseToken.sol";

/// @title LandBaseToken
/// @author The Sandbox
/// @custom:security-contact contact-blockchain@sandbox.game
/// @notice Implement LAND and quad functionalities on top of an ERC721 token
/// @dev This contract implements a quad tree structure to handle groups of ERC721 tokens at once
abstract contract LandBaseToken is IErrors, ILandToken, ERC721BaseToken {
    using Address for address;

    /// @notice the coordinates are invalid
    /// @param size The size of the quad
    /// @param x The bottom left x coordinate of the quad
    /// @param y The bottom left y coordinate of the quad
    error InvalidCoordinates(uint256 size, uint256 x, uint256 y);

    /// @notice is not the owner of the quad
    /// @param x The bottom left x coordinate of the quad
    /// @param y The bottom left y coordinate of the quad
    error NotOwner(uint256 x, uint256 y);

    /// @notice the token is already minted
    /// @param tokenId the id of land
    error AlreadyMinted(uint256 tokenId);

    uint256 internal constant GRID_SIZE = 408;

    /* solhint-disable const-name-snakecase */
    uint256 internal constant LAYER = 0xFF00000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_1x1 = 0x0000000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_3x3 = 0x0100000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_6x6 = 0x0200000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_12x12 = 0x0300000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_24x24 = 0x0400000000000000000000000000000000000000000000000000000000000000;
    /* solhint-enable const-name-snakecase */

    event Minter(address indexed minter, bool enabled);

    /// @dev helper struct to store arguments in memory instead of the stack.
    struct Land {
        uint256 x;
        uint256 y;
        uint256 size;
    }

    /// @notice Enable or disable the ability of `minter` to mint tokens
    /// @param minter address that will be given/removed minter right.
    /// @param enabled set whether the minter is enabled or disabled.
    function setMinter(address minter, bool enabled) external onlyAdmin {
        _setMinter(minter, enabled);
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
        if (from == address(0) || to == address(0)) {
            revert InvalidAddress();
        }
        if (sizes.length != xs.length || xs.length != ys.length) {
            revert InvalidLength();
        }
        address msgSender = _msgSender();
        if (msgSender != from && !_isApprovedForAllOrSuperOperator(from, msgSender)) {
            revert ERC721InvalidOwner(msgSender);
        }
        uint256 numTokensTransferred = 0;
        for (uint256 i = 0; i < sizes.length; i++) {
            uint256 size = sizes[i];
            _isValidQuad(size, xs[i], ys[i]);
            _transferQuad(from, to, size, xs[i], ys[i]);
            numTokensTransferred += size * size;
        }
        _transferNumNFTPerAddress(from, to, numTokensTransferred);

        if (to.code.length > 0 && _checkInterfaceWith10000Gas(to, ERC721_MANDATORY_RECEIVER)) {
            uint256[] memory ids = new uint256[](numTokensTransferred);
            uint256 counter = 0;
            for (uint256 j = 0; j < sizes.length; j++) {
                uint256 size = sizes[j];
                for (uint256 i = 0; i < size * size; i++) {
                    ids[counter] = _idInPath(i, size, xs[j], ys[j]);
                    counter++;
                }
            }
            _checkOnERC721BatchReceived(msgSender, from, to, ids, data);
        }
    }

    /// @notice transfer one quad (aligned to a quad tree with size 3, 6, 12 or 24 only)
    /// @param from current owner of the quad
    /// @param to destination
    /// @param size The size of the quad
    /// @param x The bottom left x coordinate of the quad
    /// @param y The bottom left y coordinate of the quad
    /// @param data additional data for transfer
    function transferQuad(
        address from,
        address to,
        uint256 size,
        uint256 x,
        uint256 y,
        bytes calldata data
    ) external override {
        address msgSender = _msgSender();
        if (from == address(0) || to == address(0)) {
            revert InvalidAddress();
        }
        if (msgSender != from && !_isApprovedForAllOrSuperOperator(from, msgSender)) {
            revert ERC721InvalidOwner(msgSender);
        }
        _isValidQuad(size, x, y);
        _transferQuad(from, to, size, x, y);
        _transferNumNFTPerAddress(from, to, size * size);
        _checkBatchReceiverAcceptQuad(msgSender, from, to, size, x, y, data);
    }

    /// @notice Mint a new quad (aligned to a quad tree with size 1, 3, 6, 12 or 24 only)
    /// @param to The recipient of the new quad
    /// @param size The size of the new quad
    /// @param x The bottom left x coordinate of the new quad
    /// @param y The bottom left y coordinate of the new quad
    /// @param data extra data to pass to the transfer
    function mintQuad(address to, uint256 size, uint256 x, uint256 y, bytes memory data) external virtual override {
        address msgSender = _msgSender();
        if (!_isMinter(msgSender)) {
            revert ERC721InvalidOwner(msgSender);
        }
        _isValidQuad(size, x, y);
        _mintQuad(msgSender, to, size, x, y, data);
    }

    /// @notice Checks if a parent quad has child quads already minted.
    /// @notice Then mints the rest child quads and transfers the parent quad.
    /// @notice Should only be called by the tunnel.
    /// @param to The recipient of the new quad
    /// @param size The size of the new quad
    /// @param x The bottom left x coordinate of the new quad
    /// @param y The bottom left y coordinate of the new quad
    /// @param data extra data to pass to the transfer
    function mintAndTransferQuad(address to, uint256 size, uint256 x, uint256 y, bytes calldata data) external virtual {
        address msgSender = _msgSender();
        if (!_isMinter(msgSender)) {
            revert ERC721InvalidOwner(msgSender);
        }
        if (to == address(0)) {
            revert InvalidAddress();
        }

        _isValidQuad(size, x, y);
        if (_ownerOfQuad(size, x, y) != address(0)) {
            _transferQuad(msgSender, to, size, x, y);
            _transferNumNFTPerAddress(msgSender, to, size * size);
            _checkBatchReceiverAcceptQuad(msgSender, msgSender, to, size, x, y, data);
        } else {
            _mintAndTransferQuad(msgSender, to, size, x, y, data);
        }
    }

    /// @inheritdoc ERC721BaseToken
    function batchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids,
        bytes calldata data
    ) external virtual override(ILandToken, ERC721BaseToken) {
        _batchTransferFrom(from, to, ids, data, false);
    }

    /// @notice x coordinate of Land token
    /// @param tokenId the id of land
    /// @return the x coordinates
    function getX(uint256 tokenId) external pure returns (uint256) {
        return _getX(tokenId);
    }

    /// @notice y coordinate of Land token
    /// @param tokenId the id of land
    /// @return the y coordinates
    function getY(uint256 tokenId) external pure returns (uint256) {
        return _getY(tokenId);
    }

    /// @notice Check if the contract supports an interface
    /// @param interfaceId The id of the interface
    /// @return True if the interface is supported
    function supportsInterface(bytes4 interfaceId) public pure virtual override returns (bool) {
        return
            interfaceId == type(IERC721).interfaceId ||
            interfaceId == type(IERC721Metadata).interfaceId ||
            interfaceId == type(IERC165).interfaceId;
    }

    /// @notice Return the name of the token contract
    /// @return The name of the token contract
    function name() external pure virtual returns (string memory) {
        return "Sandbox's LANDs";
    }

    /// @notice check whether address `who` is given minter rights.
    /// @param who The address to query.
    /// @return whether the address has minter rights.
    function isMinter(address who) external view virtual returns (bool) {
        return _isMinter(who);
    }

    /// @notice checks if Land has been minted or not
    /// @param size The size of the quad
    /// @param x The bottom left x coordinate of the quad
    /// @param y The bottom left y coordinate of the quad
    /// @return bool for if Land has been minted or not
    function exists(uint256 size, uint256 x, uint256 y) external view virtual override returns (bool) {
        _isValidQuad(size, x, y);
        return _ownerOfQuad(size, x, y) != address(0);
    }

    /// @notice Return the symbol of the token contract
    /// @return The symbol of the token contract
    function symbol() external pure virtual returns (string memory) {
        return "LAND";
    }

    /// @notice total width of the map
    /// @return width
    function width() external pure virtual returns (uint256) {
        return GRID_SIZE;
    }

    /// @notice total height of the map
    /// @return height
    function height() public pure returns (uint256) {
        return GRID_SIZE;
    }

    /// @notice Return the URI of a specific token
    /// @param tokenId The id of the token
    /// @return The URI of the token
    function tokenURI(uint256 tokenId) external view virtual returns (string memory) {
        if (_ownerOf(tokenId) == address(0)) {
            revert ERC721NonexistentToken(tokenId);
        }
        return string(abi.encodePacked("https://api.sandbox.game/lands/", Strings.toString(tokenId), "/metadata.json"));
    }

    /// @notice Check size and coordinate of a quad
    /// @param size The size of the quad
    /// @param x The bottom left x coordinate of the quad
    /// @param y The bottom left y coordinate of the quad
    /// @dev after calling this function we can safely use unchecked math for x,y,size
    function _isValidQuad(uint256 size, uint256 x, uint256 y) internal pure {
        if (size != 1 && size != 3 && size != 6 && size != 12 && size != 24) {
            revert InvalidCoordinates(size, x, y);
        }
        if (x % size != 0 || y % size != 0 || x > GRID_SIZE - size || y > GRID_SIZE - size) {
            revert InvalidCoordinates(size, x, y);
        }
    }

    /// @param from current owner of the quad
    /// @param to destination
    /// @param size The size of the quad
    /// @param x The bottom left x coordinate of the quad
    /// @param y The bottom left y coordinate of the quad
    function _transferQuad(address from, address to, uint256 size, uint256 x, uint256 y) internal {
        if (size == 1) {
            uint256 id1x1 = _getQuadId(LAYER_1x1, x, y);
            address owner = _ownerOf(id1x1);
            if (owner == address(0)) {
                revert InvalidCoordinates(size, x, y);
            }
            if (owner != from) {
                revert ERC721InvalidOwner(from);
            }
            _writeOwnerData(id1x1, uint160(address(to)));
        } else {
            _regroupQuad(from, to, Land({x: x, y: y, size: size}), true, size / 2);
        }
        for (uint256 i = 0; i < size * size; i++) {
            emit Transfer(from, to, _idInPath(i, size, x, y));
        }
    }

    /// @notice Mint a new quad
    /// @param msgSender The original sender of the transaction
    /// @param to The recipient of the new quad
    /// @param size The size of the new quad
    /// @param x The bottom left x coordinate of the new quad
    /// @param y The bottom left y coordinate of the new quad
    /// @param data extra data to pass to the transfer
    function _mintQuad(address msgSender, address to, uint256 size, uint256 x, uint256 y, bytes memory data) internal {
        if (to == address(0)) {
            revert InvalidAddress();
        }

        (uint256 layer, , ) = _getQuadLayer(size);
        uint256 quadId = _getQuadId(layer, x, y);

        _checkQuadIsNotMinted(size, x, y, 24);
        for (uint256 i = 0; i < size * size; i++) {
            uint256 _id = _idInPath(i, size, x, y);
            if (_readOwnerData(_id) != 0) {
                revert AlreadyMinted(_id);
            }
            emit Transfer(address(0), to, _id);
        }

        _writeOwnerData(quadId, uint160(to));
        _addNumNFTPerAddress(to, size * size);
        _checkBatchReceiverAcceptQuad(msgSender, address(0), to, size, x, y, data);
    }

    /// @notice checks if the child quads in the parent quad (size, x, y) are owned by msgSender.
    /// @param msgSender The original sender of the transaction
    /// @param to The address to which the ownership of the quad will be transferred
    /// @param size The size of the quad being minted and transfered
    /// @param x The x-coordinate of the top-left corner of the quad being minted.
    /// @param y The y-coordinate of the top-left corner of the quad being minted.
    /// @dev It recursively checks child quad of every size(exculding Lands of 1x1 size) are minted or not.
    /// @dev Quad which are minted are pushed into quadMinted to also check if every Land of size 1x1 in
    /// @dev the parent quad is minted or not. While checking if the every child Quad and Land is minted it
    /// @dev also checks and clear the owner for quads which are minted. Finally it checks if the new owner
    /// @dev if is a contract can handle ERC721 tokens or not and transfers the parent quad to new owner.
    function _mintAndTransferQuad(
        address msgSender,
        address to,
        uint256 size,
        uint256 x,
        uint256 y,
        bytes memory data
    ) internal {
        (uint256 layer, , ) = _getQuadLayer(size);
        uint256 quadId = _getQuadId(layer, x, y);

        // Length of array is equal to number of 3x3 child quad a 24x24 quad can have. Would be used to push the minted Quads.
        Land[] memory quadMinted = new Land[](64);
        // index of last minted quad pushed on quadMinted Array
        uint256 index;
        uint256 landMinted;

        // if size of the Quad in land struct to be transfered is greater than 3 we check recursivly if the child quads are minted or not.
        if (size > 3) {
            (index, landMinted) = _checkQuadIsNotMintedAndClearOwner(
                msgSender,
                Land({x: x, y: y, size: size}),
                quadMinted,
                landMinted,
                index,
                size / 2
            );
        }

        // Lopping around the Quad in land struct to generate ids of 1x1 land token and checking if they are owned by msg.sender
        for (uint256 i = 0; i < size * size; i++) {
            uint256 _id = _idInPath(i, size, x, y);
            // checking land with token id "_id" is in the quadMinted array.
            bool isAlreadyMinted = _isQuadMinted(quadMinted, Land({x: _getX(_id), y: _getY(_id), size: 1}), index);
            if (isAlreadyMinted) {
                // if land is in the quadMinted array there just emitting transfer event
                emit Transfer(msgSender, to, _id);
            } else {
                if (_getOwnerAddress(_id) == msgSender) {
                    if (_readOperator(_id) != address(0)) _writeOperator(_id, address(0));
                    landMinted += 1;
                    emit Transfer(msgSender, to, _id);
                } else {
                    // else is checked if owned by the msgSender or not. If it is not owned by msgSender it should not have an owner.
                    if (_readOwnerData(_id) != 0) {
                        revert AlreadyMinted(_id);
                    }

                    emit Transfer(address(0), to, _id);
                }
            }
        }

        // checking if the new owner "to" is a contract. If yes, checking if it could handle ERC721 tokens.
        _checkBatchReceiverAcceptQuadAndClearOwner(msgSender, quadMinted, index, landMinted, to, size, x, y, data);

        _writeOwnerData(quadId, uint160(to));
        _addNumNFTPerAddress(to, size * size);
        _subNumNFTPerAddress(msgSender, landMinted);
    }

    /// @notice recursively checks if the child quads are minted.
    /// @param size The size of the quad
    /// @param x The x-coordinate of the top-left corner of the quad being minted.
    /// @param y The y-coordinate of the top-left corner of the quad being minted.
    /// @param quadCompareSize the size of the child quads to be checked.
    function _checkQuadIsNotMinted(uint256 size, uint256 x, uint256 y, uint256 quadCompareSize) internal {
        (uint256 layer, , ) = _getQuadLayer(quadCompareSize);

        if (size <= quadCompareSize) {
            // when the size of the quad is smaller than the quadCompareSize(size to be compared with),
            // then it is checked if the bigger quad which encapsulates the quad to be minted
            // of with size equals the quadCompareSize has been minted or not
            uint256 id = _getQuadId(
                layer,
                (x / quadCompareSize) * quadCompareSize,
                (y / quadCompareSize) * quadCompareSize
            );
            if (_readOwnerData(id) != 0) {
                revert AlreadyMinted(id);
            }
        } else {
            // when the size is smaller than the quadCompare size the owner of all the smaller quads with size
            // quadCompare size in the quad to be minted are checked if they are minted or not
            uint256 toX = x + size;
            uint256 toY = y + size;
            for (uint256 xi = x; xi < toX; xi += quadCompareSize) {
                for (uint256 yi = y; yi < toY; yi += quadCompareSize) {
                    uint256 id = _getQuadId(layer, xi, yi);
                    if (_readOwnerData(id) != 0) {
                        revert AlreadyMinted(id);
                    }
                }
            }
        }

        quadCompareSize = quadCompareSize / 2;
        if (quadCompareSize >= 3) _checkQuadIsNotMinted(size, x, y, quadCompareSize);
    }

    /// @notice recursively checks if the child quads are minted in land and push them to the quadMinted array.
    /// @param msgSender The original sender of the transaction
    /// @param land the struct which has the size x and y co-ordinate of Quad to be checked
    /// @param quadMinted array in which the minted child quad would be pushed
    /// @param landMinted total 1x1 land already minted
    /// @param index index of last element of quadMinted array
    /// @param quadCompareSize the size of the child quads to be checked.
    /// @return the index of last quad pushed in quadMinted array and the total land already minted
    /// @dev if a child quad is minted in land such quads child quads will be skipped such that there is no overlapping
    /// @dev in quads which are minted. it clears the minted child quads owners.
    function _checkQuadIsNotMintedAndClearOwner(
        address msgSender,
        Land memory land,
        Land[] memory quadMinted,
        uint256 landMinted,
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
                    address owner = _getOwnerAddress(id);
                    // owner of the child quad is checked to be owned by msgSender else should not be owned by anyone.
                    if (owner == msgSender) {
                        // if child quad is minted it would be pushed in quadMinted array.
                        quadMinted[index] = Land({x: xi, y: yi, size: quadCompareSize});
                        // index of quadMinted is increased
                        index++;
                        // total land minted is increase by the number if land of 1x1 in child quad
                        landMinted += quadCompareSize * quadCompareSize;
                        //owner is cleared
                        _writeOwnerData(id, 0);
                    } else {
                        if (owner != address(0)) {
                            revert AlreadyMinted(id);
                        }
                    }
                }
            }
        }

        // size of the child quad is set to be the next smaller child quad size (12 => 6 => 3)
        quadCompareSize = quadCompareSize / 2;
        // if child quad size is greater than 3 _checkAndClearOwner is checked for new child quads in the  quad in land struct.
        if (quadCompareSize >= 3)
            (index, landMinted) = _checkQuadIsNotMintedAndClearOwner(
                msgSender,
                land,
                quadMinted,
                landMinted,
                index,
                quadCompareSize
            );
        return (index, landMinted);
    }

    /// @dev checks the owner of land with 'tokenId' to be 'from' and clears it
    /// @param from the address to be checked against the owner of the land
    /// @param x The x-coordinate of the top-left corner of the quad being minted.
    /// @param y The y-coordinate of the top-left corner of the quad being minted.
    /// @return bool for if land is owned by 'from' or not.
    function _checkAndClearLandOwner(address from, uint256 x, uint256 y) internal returns (bool) {
        uint256 tokenId = _getQuadId(LAYER_1x1, x, y);
        uint256 currentOwner = _readOwnerData(tokenId);
        if (currentOwner != 0) {
            if ((currentOwner & BURNED_FLAG) == BURNED_FLAG) {
                revert NotOwner(x, y);
            }
            if (address(uint160(currentOwner)) != from) {
                revert ERC721InvalidOwner(from);
            }
            _writeOwnerData(tokenId, 0);
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
        if (to.code.length > 0 && _checkInterfaceWith10000Gas(to, ERC721_MANDATORY_RECEIVER)) {
            uint256[] memory ids = new uint256[](size * size);
            for (uint256 i = 0; i < size * size; i++) {
                ids[i] = _idInPath(i, size, x, y);
            }
            _checkOnERC721BatchReceived(operator, from, to, ids, data);
        }
    }

    /// @param msgSender The original sender of the transaction
    /// @param quadMinted - an array of Land structs in which the minted child quad or Quad to be transfered are.
    /// @param landMinted - the total amount of land that has been minted
    /// @param index - the index of the last element in the quadMinted array
    /// @param to the address of the new owner of Quad to be transfered
    /// @param size The size of the quad
    /// @param x The x-coordinate of the top-left corner of the quad being minted.
    /// @param y The y-coordinate of the top-left corner of the quad being minted.
    /// @dev checks if the receiver of the quad(size, x, y) is a contact. If yes can it handle ERC721 tokens. It also clears owner of 1x1 land's owned by msgSender.
    function _checkBatchReceiverAcceptQuadAndClearOwner(
        address msgSender,
        Land[] memory quadMinted,
        uint256 index,
        uint256 landMinted,
        address to,
        uint256 size,
        uint256 x,
        uint256 y,
        bytes memory data
    ) internal {
        // checks if to is a contract and supports ERC721_MANDATORY_RECEIVER interfaces. if it doesn't it just clears the owner of 1x1 lands in quad(size, x, y)
        if (to.code.length > 0 && _checkInterfaceWith10000Gas(to, ERC721_MANDATORY_RECEIVER)) {
            // array to push minted 1x1 land
            uint256[] memory idsToTransfer = new uint256[](landMinted);
            // index of last land pushed in idsToTransfer array
            uint256 transferIndex;
            // array to push ids to be minted
            uint256[] memory idsToMint = new uint256[]((size * size) - landMinted);
            // index of last land pushed in idsToMint array
            uint256 mintIndex;

            // iterating over every 1x1 land in the quad to be pushed in the above arrays
            for (uint256 i = 0; i < size * size; i++) {
                uint256 id = _idInPath(i, size, x, y);

                if (_isQuadMinted(quadMinted, Land({x: _getX(id), y: _getY(id), size: 1}), index)) {
                    // if land is in the quads already minted it just pushed in to the idsToTransfer array
                    idsToTransfer[transferIndex] = id;
                    transferIndex++;
                } else if (_getOwnerAddress(id) == msgSender) {
                    // if it is owned by the msgSender owner data is removed and it is pused in to idsToTransfer array
                    _writeOwnerData(id, 0);
                    idsToTransfer[transferIndex] = id;
                    transferIndex++;
                } else {
                    // else it is not owned by any one and and pushed in teh idsToMint array
                    idsToMint[mintIndex] = id;
                    mintIndex++;
                }
            }

            // checking if "to" contact can handle ERC721 tokens
            _checkOnERC721BatchReceived(msgSender, address(0), to, idsToMint, data);
            _checkOnERC721BatchReceived(msgSender, msgSender, to, idsToTransfer, data);
        } else {
            for (uint256 i = 0; i < size * size; i++) {
                uint256 id = _idInPath(i, size, x, y);
                if (_getOwnerAddress(id) == msgSender) _writeOwnerData(id, 0);
            }
        }
    }

    /// @notice x coordinate of Land token
    /// @param tokenId The token id
    /// @return the x coordinates
    function _getX(uint256 tokenId) internal pure returns (uint256) {
        return (tokenId & ~LAYER) % GRID_SIZE;
    }

    /// @notice y coordinate of Land token
    /// @param tokenId The token id
    /// @return the y coordinates
    function _getY(uint256 tokenId) internal pure returns (uint256) {
        return (tokenId & ~LAYER) / GRID_SIZE;
    }

    /// @notice check if a quad is in the array of minted lands
    /// @param quad the quad that will be searched through mintedLand
    /// @param quadMinted array of quads that are minted in the current transaction
    /// @param index the amount of entries in mintedQuad
    /// @return true if a quad is minted
    function _isQuadMinted(Land[] memory quadMinted, Land memory quad, uint256 index) internal pure returns (bool) {
        for (uint256 i = 0; i < index; i++) {
            Land memory land = quadMinted[i];
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

    /// @notice get size related information (there is one-to-one relationship between layer and size)
    /// @param size The size of the quad
    /// @return layer the layers that corresponds to the size
    /// @return parentSize the size of the parent (bigger quad that contains the current one)
    /// @return childLayer the layer of the child (smaller quad contained by this one)
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
        } else {
            layer = LAYER_24x24;
            childLayer = LAYER_12x12;
        }
    }

    /// @notice get the quad id given the layer and coordinates.
    /// @param layer the layer of the quad see: _getQuadLayer
    /// @param x The bottom left x coordinate of the quad
    /// @param y The bottom left y coordinate of the quad
    /// @return the tokenId of the quad
    /// @dev this method is gas optimized, must be called with verified x,y and size, after a call to _isValidQuad
    function _getQuadId(uint256 layer, uint256 x, uint256 y) internal pure returns (uint256) {
        unchecked {
            return layer + x + y * GRID_SIZE;
        }
    }

    /// @notice return the quadId given and index, size and coordinates
    /// @param i the index to be added to x,y to get row and column
    /// @param size The bottom left x coordinate of the quad
    /// @param x The bottom left x coordinate of the quad
    /// @param y The bottom left y coordinate of the quad
    /// @return the tokenId of the quad
    /// @dev this method is gas optimized, must be called with verified x,y and size, after a call to _isValidQuad
    function _idInPath(uint256 i, uint256 size, uint256 x, uint256 y) internal pure returns (uint256) {
        unchecked {
            // This is an inlined/optimized version of: _getQuadId(LAYER_1x1, x + (i % size), y + (i / size))
            return (x + (i % size)) + (y + (i / size)) * GRID_SIZE;
        }
    }

    /// @notice checks if the Land's child quads are owned by the from address and clears all the previous owners
    /// @param from address of the previous owner
    /// @param to address of the new owner
    /// @param land the quad to be regrouped and transferred
    /// @param set for setting the new owner
    /// @param childQuadSize  size of the child quad to be checked for owner in the regrouping
    /// @dev if all the child quads are not owned by the "from" address then the owner of parent quad to the land
    /// @dev is checked if owned by the "from" address. If from is the owner then land owner is set to "to" address
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

        // double for loop iterates and checks owner of all the smaller quads in land
        for (uint256 xi = land.x; xi < land.x + land.size; xi += childQuadSize) {
            for (uint256 yi = land.y; yi < land.y + land.size; yi += childQuadSize) {
                uint256 ownerChild;
                bool ownAllIndividual;
                if (childQuadSize < 3) {
                    // case when the smaller quad is 1x1,
                    ownAllIndividual = _checkAndClearLandOwner(from, xi, yi) && ownerOfAll;
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
                    ownerChild = _readOwnerData(idChild);
                    if (ownerChild != 0) {
                        // checking the owner of child quad
                        if (!ownAllIndividual && ownerChild != uint256(uint160(from))) {
                            revert NotOwner(xi, yi);
                        }
                        // clearing owner of child quad
                        _writeOwnerData(idChild, 0);
                    }
                }
                // ownerOfAll should be true if "from" is owner of all the child quads itereated over
                ownerOfAll = (ownAllIndividual || ownerChild != 0) && ownerOfAll;
            }
        }

        // if set is true it check if the "from" is owner of all else checks for the owner of parent quad is
        // owned by "from" and sets the owner for the id of land to "to" address.
        if (set) {
            if (!ownerOfAll && _ownerOfQuad(land.size, land.x, land.y) != from) {
                revert ERC721InvalidOwner(from);
            }
            _writeOwnerData(quadId, uint160(to));
            return true;
        }

        return ownerOfAll;
    }

    /// @notice return the owner of a quad given his size and coordinates or zero if is not minted yet.
    /// @param size The size of the quad
    /// @param x The bottom left x coordinate of the quad
    /// @param y The bottom left y coordinate of the quad
    /// @return the address of the owner
    function _ownerOfQuad(uint256 size, uint256 x, uint256 y) internal view returns (address) {
        (uint256 layer, uint256 parentSize, ) = _getQuadLayer(size);
        address owner = _getOwnerAddress(_getQuadId(layer, (x / size) * size, (y / size) * size));
        if (owner != address(0)) {
            return owner;
        } else if (size < 24) {
            return _ownerOfQuad(parentSize, x, y);
        }
        return address(0);
    }

    /// @notice Get the owner and operatorEnabled flag of a token.
    /// @param tokenId The token to query.
    /// @return owner The owner of the token.
    /// @return operatorEnabled Whether or not operators are enabled for this token.
    function _ownerAndOperatorEnabledOf(
        uint256 tokenId
    ) internal view override returns (address owner, bool operatorEnabled) {
        if (tokenId & LAYER != 0) {
            revert ERC721NonexistentToken(tokenId);
        }
        uint256 x = tokenId % GRID_SIZE;
        uint256 y = tokenId / GRID_SIZE;
        uint256 owner1x1 = _readOwnerData(tokenId);

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

    /// @notice Enable or disable the ability of `minter` to mint tokens
    /// @param minter address that will be given/removed minter right.
    /// @param enabled set whether the minter is enabled or disabled.
    function _setMinter(address minter, bool enabled) internal {
        if (minter == address(0)) {
            revert InvalidAddress();
        }
        if (enabled == _isMinter(minter)) {
            revert InvalidArgument();
        }
        _writeMinter(minter, enabled);
        emit Minter(minter, enabled);
    }

    /// @notice checks if an address is enabled as minter
    /// @param minter the address to check
    /// @return true if the address is a minter
    function _isMinter(address minter) internal view virtual returns (bool);

    /// @notice set an address as minter
    /// @param minter the address to set
    /// @param enabled true enable the address, false disable it.
    function _writeMinter(address minter, bool enabled) internal virtual;
}
