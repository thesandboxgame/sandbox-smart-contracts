// SPDX-License-Identifier: MIT
// solhint-disable code-complexity
pragma solidity 0.8.2;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {StringsUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";
import {AddressUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import {IPolygonLand} from "../../../common/interfaces/IPolygonLand.sol";
import {ILandToken} from "../../../common/interfaces/ILandToken.sol";
import {TileWithCoordLib} from "../../../common/Libraries/TileWithCoordLib.sol";
import {QuadLib} from "../../common/land/QuadLib.sol";
import {ERC721BaseTokenV6} from "./ERC721BaseTokenV6.sol";

abstract contract PolygonLandBaseTokenV6 is IPolygonLand, Initializable, ERC721BaseTokenV6 {
    using AddressUpgradeable for address;
    using TileWithCoordLib for TileWithCoordLib.TileWithCoord;

    uint256 internal constant GRID_SIZE = 408;

    mapping(address => bool) internal _minters;

    event Minter(address minter, bool enabled);

    modifier validQuad(
        uint256 size,
        uint256 x,
        uint256 y
    ) {
        _validQuad(size, x, y);
        _;
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
    ) external override {
        require(from != address(0), "from is zero address");
        require(to != address(0), "can't send to zero address");
        require(sizes.length == xs.length && xs.length == ys.length, "invalid data");
        if (_msgSender() != from) {
            require(_operatorsForAll[from][_msgSender()] || _superOperators[_msgSender()], "not authorized");
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
                    ids[counter] = QuadLib._idInPath(i, size, xs[j], ys[j]);
                    counter++;
                }
            }
            require(_checkOnERC721BatchReceived(_msgSender(), from, to, ids, data), "batch transfer rejected");
        }
    }

    /// @notice Enable or disable the ability of `minter` to transfer tokens of all (minter rights).
    /// @param minter address that will be given/removed minter right.
    /// @param enabled set whether the minter is enabled or disabled.
    function setMinter(address minter, bool enabled) external {
        require(_msgSender() == _admin, "only admin is allowed");
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
        bytes memory data
    ) external virtual override validQuad(size, x, y) {
        require(to != address(0), "to is zero address");
        require(isMinter(_msgSender()), "!AUTHORIZED");
        _mintQuad(to, size, x, y);
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
    function mintAndTransferQuad(
        address to,
        uint256 size,
        uint256 x,
        uint256 y,
        bytes calldata data
    ) external virtual validQuad(size, x, y) {
        require(isMinter(msg.sender), "!AUTHORIZED");
        require(to != address(0), "to is zero address");
        _mintAndTransferQuad(to, size, x, y, data);
    }

    function batchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids,
        bytes calldata data
    ) public override(ILandToken, ERC721BaseTokenV6) {
        super.batchTransferFrom(from, to, ids, data);
    }

    /// @notice x coordinate of Land token
    /// @param id tokenId
    /// @return the x coordinates
    function getX(uint256 id) external pure returns (uint256) {
        return QuadLib._getX(id);
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
    ) external view override validQuad(size, x, y) returns (bool) {
        return QuadLib._ownerOfQuad(_owners, size, x, y) != address(0);
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
    ) internal virtual {
        if (size == 1) {
            uint256 id1x1 = QuadLib._getLandId(x, y);
            address owner = _ownerOf(id1x1);
            require(owner != address(0), "token does not exist");
            require(owner == from, "not owner in _transferQuad");
            _owners[id1x1] = uint256(uint160(address(to)));
        } else if (size == 3 || size == 6 || size == 12 || size == 24) {
            require(x % size == 0 && y % size == 0, "Invalid coordinates");
            require(x <= GRID_SIZE - size && y <= GRID_SIZE - size, "Out of bounds");
            QuadLib.regroupQuad(_owners, from, to, QuadLib.Land({x: x, y: y, size: size}), size / 2);
        } else {
            require(false, "Invalid size");
        }
        for (uint256 i = 0; i < size * size; i++) {
            emit Transfer(from, to, QuadLib._idInPath(i, size, x, y));
        }
    }

    function _mintQuad(
        address to,
        uint256 size,
        uint256 x,
        uint256 y
    ) internal virtual {
        QuadLib.checkOwner(_owners, size, x, y, 24);
        for (uint256 i = 0; i < size * size; i++) {
            uint256 _id = QuadLib._idInPath(i, size, x, y);
            require(_owners[_id] == 0, "Already minted");
            emit Transfer(address(0), to, _id);
        }

        uint256 quadId = QuadLib._getQuadIdBySize(size, x, y);
        _owners[quadId] = uint256(uint160(to));
        _numNFTPerAddress[to] += size * size;
    }

    function _mintAndTransferQuad(
        address to,
        uint256 size,
        uint256 x,
        uint256 y,
        bytes calldata data
    ) internal {
        if (QuadLib._ownerOfQuad(_owners, size, x, y) != address(0)) {
            _transferQuad(msg.sender, to, size, x, y);
            _numNFTPerAddress[msg.sender] -= size * size;
            _numNFTPerAddress[to] += size * size;
            _checkBatchReceiverAcceptQuad(msg.sender, msg.sender, to, size, x, y, data);
        } else {
            QuadLib.QuadTransferred memory quadTransferred = _transferQuadMinting(to, size, x, y);
            uint256 quadId = QuadLib._getQuadIdBySize(size, x, y);
            _owners[quadId] = uint256(uint160(to));
            _numNFTPerAddress[to] += size * size;
            _numNFTPerAddress[msg.sender] -= quadTransferred.cant;

            if (to.isContract() && _checkInterfaceWith10000Gas(to, ERC721_MANDATORY_RECEIVER)) {
                uint256[] memory idsToTransfer = new uint256[](quadTransferred.cant);
                uint256[] memory idsToMint = new uint256[](size * size - quadTransferred.cant);
                for (uint256 i = 0; i < size * size; i++) {
                    uint256 id = QuadLib._idInPath(i, size, x, y);
                    if (quadTransferred.quad.contain(QuadLib._getX(id), QuadLib._getY(id))) {
                        idsToTransfer[idsToTransfer.length] = id;
                    } else {
                        idsToMint[idsToMint.length] = id;
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
            }
        }
    }

    function _transferQuadMinting(
        address to,
        uint256 size,
        uint256 x,
        uint256 y
    ) internal virtual returns (QuadLib.QuadTransferred memory quadTransferred) {
        require(to != address(0), "to is zero address");

        quadTransferred = QuadLib.checkAndClearOwner(_owners, QuadLib.Land({x: x, y: y, size: size}), size / 2);

        for (uint256 i = 0; i < size * size; i++) {
            uint256 _id = QuadLib._idInPath(i, size, x, y);
            uint256 xi = QuadLib._getX(_id);
            uint256 yi = QuadLib._getY(_id);
            if (quadTransferred.quad.contain(xi, yi)) {
                emit Transfer(msg.sender, to, _id);
            } else {
                if (_owners[_id] == uint256(uint160(msg.sender))) {
                    _owners[_id] = 0;
                    quadTransferred.quad = quadTransferred.quad.set(xi, yi, 1);
                    quadTransferred.cant += 1;
                    emit Transfer(msg.sender, to, _id);
                } else {
                    require(_owners[_id] == 0, "Already minted");
                    emit Transfer(address(0), to, _id);
                }
            }
        }
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
                ids[i] = QuadLib._idInPath(i, size, x, y);
            }
            require(_checkOnERC721BatchReceived(operator, from, to, ids, data), "batch transfer rejected");
        }
    }

    function _ownerOf(uint256 id) internal view override returns (address) {
        (uint256 size, uint256 x, uint256 y) = QuadLib._getQuadById(id);
        require(x % size == 0 && y % size == 0, "Invalid token id");
        if (size == 1) {
            uint256 owner1x1 = _owners[id];
            return (owner1x1 & BURNED_FLAG) == BURNED_FLAG ? address(0) : QuadLib._ownerOfQuad(_owners, size, x, y);
        }
        return QuadLib._ownerOfQuad(_owners, size, x, y);
    }

    function _ownerAndOperatorEnabledOf(uint256 id)
        internal
        view
        override
        returns (address owner, bool operatorEnabled)
    {
        require(!QuadLib._hasLayer(id), "Invalid token id");
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
            owner = QuadLib._ownerOfQuad(_owners, 3, (x * 3) / 3, (y * 3) / 3);
            operatorEnabled = false;
        }
    }

    function _validQuad(
        uint256 size,
        uint256 x,
        uint256 y
    ) internal pure {
        require(size == 1 || size == 3 || size == 6 || size == 12 || size == 24, "Invalid size");
        require(x % size == 0 && y % size == 0, "Invalid coordinates");
        require(x <= GRID_SIZE - size && y <= GRID_SIZE - size, "Out of bounds");
    }

    // Empty storage space in contracts for future enhancements
    // ref: https://github.com/OpenZeppelin/openzeppelin-contracts-upgradeable/issues/13)
    uint256[49] private __gap;
}
