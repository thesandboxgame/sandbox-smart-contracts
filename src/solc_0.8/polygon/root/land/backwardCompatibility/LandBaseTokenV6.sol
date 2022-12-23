/* solhint-disable code-complexity */
// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {AddressUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import {QuadLib} from "../../../common/land/QuadLib.sol";
import {QuadTransferredLib} from "../../../common/land/QuadTransferredLib.sol";
import {ERC721BaseTokenV6} from "./ERC721BaseTokenV6.sol";

contract LandBaseTokenV6 is ERC721BaseTokenV6 {
    using AddressUpgradeable for address;
    using QuadTransferredLib for QuadTransferredLib.QuadTransferred;

    // Our grid is 408 x 408 lands
    uint256 internal constant GRID_SIZE = 408;

    mapping(address => bool) internal _minters;

    event Minter(address superOperator, bool enabled);

    modifier validQuad(
        uint256 size,
        uint256 x,
        uint256 y
    ) {
        _validQuad(size, x, y);
        _;
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
    ) external validQuad(size, x, y) {
        require(to != address(0), "to is zero address");
        require(isMinter(msg.sender), "Only a minter can mint");
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
                    ids[counter] = QuadLib._idInPath(i, size, xs[j], ys[j]);
                    counter++;
                }
            }
            require(
                _checkOnERC721BatchReceived(metaTx ? from : msg.sender, from, to, ids, data),
                "batch transfer rejected"
            );
        }
    }

    /// @notice Enable or disable the ability of `minter` to mint tokens
    /// @param minter address that will be given/removed minter right.
    /// @param enabled set whether the minter is enabled or disabled.
    function setMinter(address minter, bool enabled) external {
        require(msg.sender == _admin, "only admin allowed");
        require(minter != address(0), "invalid address");
        require(enabled != _minters[minter], "invalid status");
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
        return QuadLib._getX(id);
    }

    /// @notice y coordinate of Land token
    /// @param id tokenId
    /// @return the y coordinates
    function getY(uint256 id) external pure returns (uint256) {
        return QuadLib._getY(id);
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
    ) external view validQuad(size, x, y) returns (bool) {
        return QuadLib._ownerOfQuad(_owners, size, x, y) != address(0);
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
            QuadTransferredLib.QuadTransferred memory quadTransferred = _transferQuadMinting(to, size, x, y);
            uint256 quadId = QuadLib._getQuadIdBySize(size, x, y);
            uint256 cant = quadTransferred.count();
            _owners[quadId] = uint256(uint160(to));
            _numNFTPerAddress[to] += size * size;
            _numNFTPerAddress[msg.sender] -= cant;

            if (to.isContract() && _checkInterfaceWith10000Gas(to, ERC721_MANDATORY_RECEIVER)) {
                uint256[] memory idsToTransfer = new uint256[](cant);
                uint256[] memory idsToMint = new uint256[](size * size - cant);
                for (uint256 i = 0; i < size * size; i++) {
                    uint256 id = QuadLib._idInPath(i, size, x, y);
                    if (quadTransferred.contain(QuadLib._getX(id), QuadLib._getY(id))) {
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
    ) internal virtual returns (QuadTransferredLib.QuadTransferred memory quadTransferred) {
        require(to != address(0), "to is zero address");
        require(isMinter(msg.sender), "Only a minter can mint");

        quadTransferred = QuadLib.checkAndClearOwner(_owners, QuadLib.Land({x: x, y: y, size: size}), size / 2);

        for (uint256 i = 0; i < size * size; i++) {
            uint256 _id = QuadLib._idInPath(i, size, x, y);
            uint256 xi = QuadLib._getX(_id);
            uint256 yi = QuadLib._getY(_id);
            bool isAlreadyMinted = quadTransferred.contain(xi, yi);
            if (isAlreadyMinted) {
                emit Transfer(msg.sender, to, _id);
            } else {
                if (_owners[_id] == uint256(uint160(msg.sender))) {
                    _owners[_id] = 0;
                    quadTransferred = quadTransferred.set(xi, yi);
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
            _owners[id1x1] = uint256(uint160(to));
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

    function _ownerOf(uint256 id) internal view override returns (address) {
        (uint256 size, uint256 x, uint256 y) = QuadLib._getQuadById(id);
        require(x % size == 0 && y % size == 0, "Invalid token id");
        return QuadLib._ownerOfQuad(_owners, size, x, y);
    }

    function _ownerAndOperatorEnabledOf(uint256 id)
        internal
        view
        override
        returns (address owner, bool operatorEnabled)
    {
        require(!QuadLib._hasLayer(id), "Invalid token id");
        uint256 x = QuadLib._getX(id);
        uint256 y = QuadLib._getY(id);
        uint256 owner1x1 = _owners[id];

        if (owner1x1 != 0) {
            owner = address(uint160(owner1x1));
            operatorEnabled = (owner1x1 / 2**255) == 1;
        } else {
            owner = QuadLib._ownerOfQuad(_owners, 3, (x * 3) / 3, (y * 3) / 3);
            operatorEnabled = false;
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

    function _validQuad(
        uint256 size,
        uint256 x,
        uint256 y
    ) internal pure {
        require(size == 1 || size == 3 || size == 6 || size == 12 || size == 24, "Invalid size");
        require(x % size == 0 && y % size == 0, "Invalid coordinates");
        require(x <= GRID_SIZE - size && y <= GRID_SIZE - size, "Out of bounds");
    }
}
