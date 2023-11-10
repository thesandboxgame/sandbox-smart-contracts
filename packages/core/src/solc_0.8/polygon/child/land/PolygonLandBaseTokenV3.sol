// SPDX-License-Identifier: MIT
// solhint-disable code-complexity

pragma solidity 0.8.2;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {StringsUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";
import {AddressUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import {ERC721BaseTokenV2} from "../../../common/BaseWithStorage/ERC721BaseTokenV2.sol";
import {IPolygonLand} from "../../../common/interfaces/IPolygonLand.sol";
import {ILandToken} from "../../../common/interfaces/ILandToken.sol";
import {QuadLib} from "../../common/land/QuadLib.sol";

/**
 * @title PolygonLandBaseTokenV2
 * @author The Sandbox
 * @notice Implement LAND and quad functionalities on top of an ERC721 token
 * @dev This contract implements a quad tree structure to handle groups of ERC721 tokens at once
 */
abstract contract PolygonLandBaseTokenV3 is IPolygonLand, Initializable, ERC721BaseTokenV2 {
    using AddressUpgradeable for address;

    mapping(address => bool) internal _minters;

    event Minter(address indexed minter, bool enabled);

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
        require(sizes.length == xs.length, "PolygonLandBaseTokenV2: sizes's and x's length are different");
        require(xs.length == ys.length, "PolygonLandBaseTokenV2: x's and y's length are different");
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
    function setMinter(address minter, bool enabled) external onlyAdmin {
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
    /// @param data additional data for transfer
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
    ) external virtual override {
        _isValidQuad(size, x, y);
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

        if (exists(size, x, y)) {
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
        return QuadLib._getX(id);
    }

    /// @inheritdoc ERC721BaseTokenV2
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
        return QuadLib._getY(id);
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
    ) public view override returns (bool) {
        _isValidQuad(size, x, y);
        return QuadLib.ownerOfQuad(_owners, size, x, y) != address(0);
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
        return QuadLib.GRID_SIZE;
    }

    /// @notice total height of the map
    /// @return height
    function height() public pure returns (uint256) {
        return QuadLib.GRID_SIZE;
    }

    /**
     * @notice Return the URI of a specific token
     * @param id The id of the token
     * @return The URI of the token
     */
    function tokenURI(uint256 id) public view returns (string memory) {
        require(QuadLib.ownerOf(_owners, id) != address(0), "Id does not exist");
        return
        string(
            abi.encodePacked("https://api.sandbox.game/lands/", StringsUpgradeable.toString(id), "/metadata.json")
        );
    }

    function _mintQuad(
        address to,
        uint256 size,
        uint256 x,
        uint256 y,
        bytes memory data
    ) internal {
        require(to != address(0), "to is zero address");

        (uint256 layer, ,) = QuadLib._getQuadLayer(size);
        uint256 quadId = QuadLib._getQuadId(layer, x, y);

        QuadLib.checkOwner(_owners, size, x, y, 24);
        for (uint256 i = 0; i < size * size; i++) {
            uint256 _id = _idInPath(i, size, x, y);
            require(_owners[_id] == 0, "Already minted");
            emit Transfer(address(0), to, _id);
        }

        _owners[quadId] = uint256(uint160(to));
        _numNFTPerAddress[to] += size * size;

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
        (uint256 layer, ,) = QuadLib._getQuadLayer(size);
        uint256 quadId = QuadLib._getQuadId(layer, x, y);

        // Length of array is equal to number of 3x3 child quad a 24x24 quad can have. Would be used to push the minted Quads.
        QuadLib.Land[] memory quadMinted = new QuadLib.Land[](64);
        // index of last minted quad pushed on quadMinted Array
        uint256 index;
        uint256 landMinted;

        // if size of the Quad in land struct to be transfered is greater than 3 we check recursivly if the child quads are minted or not.
        if (size > 3) {
            (index, landMinted) = QuadLib.checkAndClearOwner(
                _owners,
                QuadLib.Land({x : x, y : y, size : size}),
                quadMinted,
                size / 2
            );
        }

        // Lopping around the Quad in land struct to generate ids of 1x1 land token and checking if they are owned by msg.sender
        {
            for (uint256 i = 0; i < size * size; i++) {
                uint256 _id = _idInPath(i, size, x, y);
                // checking land with token id "_id" is in the quadMinted array.
                bool isAlreadyMinted = QuadLib._isQuadMinted(quadMinted, QuadLib.Land({x : QuadLib._getX(_id), y : QuadLib._getY(_id), size : 1}), index);
                if (isAlreadyMinted) {
                    // if land is in the quadMinted array there just emitting transfer event
                    emit Transfer(msg.sender, to, _id);
                } else {
                    if (address(uint160(_owners[_id])) == msg.sender) {
                        if (_operators[_id] != address(0)) _operators[_id] = address(0);
                        landMinted += 1;
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
        _checkBatchReceiverAcceptQuadAndClearOwner(quadMinted, index, landMinted, to, size, x, y, data);

        _owners[quadId] = uint256(uint160(to));
        _numNFTPerAddress[to] += size * size;
        _numNFTPerAddress[msg.sender] -= landMinted;
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

    /// @dev checks if the receiver of the quad(size, x, y) is a contact. If yes can it handle ERC721 tokens. It also clears owner of 1x1 land's owned by msg.sender.
    /// @param quadMinted - an array of Land structs in which the minted child quad or Quad to be transfered are.
    /// @param landMinted - the total amount of land that has been minted
    /// @param index - the index of the last element in the quadMinted array
    /// @param to the address of the new owner of Quad to be transfered
    /// @param size The size of the quad being minted and transfered
    /// @param x The x-coordinate of the top-left corner of the quad being minted.
    /// @param y The y-coordinate of the top-left corner of the quad being minted.
    /// @param y The y-coordinate of the top-left corner of the quad being minted.
    function _checkBatchReceiverAcceptQuadAndClearOwner(
        QuadLib.Land[] memory quadMinted,
        uint256 index,
        uint256 landMinted,
        address to,
        uint256 size,
        uint256 x,
        uint256 y,
        bytes memory data
    ) internal {
        // checks if to is a contract and supports ERC721_MANDATORY_RECEIVER interfaces. if it doesn't it just clears the owner of 1x1 lands in quad(size, x, y)
        if (to.isContract() && _checkInterfaceWith10000Gas(to, ERC721_MANDATORY_RECEIVER)) {
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

                if (QuadLib._isQuadMinted(quadMinted, QuadLib.Land({x : QuadLib._getX(id), y : QuadLib._getY(id), size : 1}), index)) {
                    // if land is in the quads already minted it just pushed in to the idsToTransfer array
                    idsToTransfer[transferIndex] = id;
                    transferIndex++;
                } else if (address(uint160(_owners[id])) == msg.sender) {
                    // if it is owned by the msg.sender owner data is removed and it is pused in to idsToTransfer array
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
                "erc721 batch transfer rejected by to"
            );
            require(
                _checkOnERC721BatchReceived(msg.sender, msg.sender, to, idsToTransfer, data),
                "erc721 batch transfer rejected by to"
            );
        } else {
            for (uint256 i = 0; i < size * size; i++) {
                uint256 id = _idInPath(i, size, x, y);
                if (address(uint160(_owners[id])) == msg.sender) _owners[id] = 0;
            }
        }
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
            return QuadLib._getQuadId(QuadLib.LAYER_1x1, (x + (i % size)), (y + row));
        } else {
            return QuadLib._getQuadId(QuadLib.LAYER_1x1, (x + size) - (1 + (i % size)), (y + row));
        }
    }

    function _ownerAndOperatorEnabledOf(uint256 id)
    internal
    view
    override
    returns (address owner, bool operatorEnabled)
    {
        return QuadLib.ownerAndOperatorEnabledOf(_owners, id);
    }

    function _transferQuad(
        address from,
        address to,
        uint256 size,
        uint256 x,
        uint256 y
    ) private {
        _isValidQuad(size, x, y);
        QuadLib.transferQuad(_owners, from, to, size, x, y);
        for (uint256 i = 0; i < size * size; i++) {
            emit Transfer(from, to, _idInPath(i, size, x, y));
        }
    }

    function _isValidQuad(
        uint256 size,
        uint256 x,
        uint256 y
    ) internal pure {
        require(size == 1 || size == 3 || size == 6 || size == 12 || size == 24, "Invalid size");
        require(x % size == 0, "Invalid x coordinate");
        require(y % size == 0, "Invalid y coordinate");
        require(x <= QuadLib.GRID_SIZE - size, "x out of bounds");
        require(y <= QuadLib.GRID_SIZE - size, "y out of bounds");
    }


    // Empty storage space in contracts for future enhancements
    // ref: https://github.com/OpenZeppelin/openzeppelin-contracts-upgradeable/issues/13)
    uint256[49] private __gap;
}
