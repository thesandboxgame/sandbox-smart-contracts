// SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import "@openzeppelin/contracts-0.8/utils/Address.sol";
import "../../../common/BaseWithStorage/ERC721BaseToken.sol";
import "@openzeppelin/contracts-0.8/access/AccessControl.sol";

contract PolygonLandBaseToken is ERC721BaseToken, AccessControl {
    using Address for address;

    uint256 internal constant GRID_SIZE = 408;

    uint256 internal constant LAYER = 0xFF00000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_1x1 = 0x0000000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_3x3 = 0x0100000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_6x6 = 0x0200000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_12x12 = 0x0300000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_24x24 = 0x0400000000000000000000000000000000000000000000000000000000000000;

    bytes32 public constant TRANSFER_ROLE = keccak256("TRANSFER_ROLE");

    /**
     * @notice Return the name of the token contract
     * @return The name of the token contract
     */
    function name() external pure returns (string memory) {
        return "Sandbox's LANDs";
    }

    /**
     * @notice Return the symbol of the token contract
     * @return The symbol of the token contract
     */
    function symbol() external pure returns (string memory) {
        return "LAND";
    }

    //necessary to solve conflicts
    function _msgData() internal view virtual override(ERC2771Handler, Context) returns (bytes calldata) {
        return ERC2771Handler._msgData();
    }

    //necessary to solve conflicts
    function _msgSender() internal view virtual override(ERC2771Handler, Context) returns (address sender) {
        return ERC2771Handler._msgSender();
    }

    /// @notice x coordinate of Land token
    /// @param id tokenId
    /// @return the x coordinates
    function x(uint256 id) external returns (uint256) {
        require(_ownerOf(id) != address(0), "token does not exist");
        return id % GRID_SIZE;
    }

    /// @notice y coordinate of Land token
    /// @param id tokenId
    /// @return the y coordinates
    function y(uint256 id) external returns (uint256) {
        require(_ownerOf(id) != address(0), "token does not exist");
        return id / GRID_SIZE;
    }

    function setUpTranferRole(address add) external {
        //only admin
        _setupRole(TRANSFER_ROLE, add);
    }

    // solium-disable-next-line security/no-assign-params
    function uint2str(uint256 _i) internal pure returns (string memory _uintAsString) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - (_i / 10) * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }

    /**
     * @notice Return the URI of a specific token
     * @param id The id of the token
     * @return The URI of the token
     */
    function tokenURI(uint256 id) public view returns (string memory) {
        require(_ownerOf(id) != address(0), "Id does not exist");
        return string(abi.encodePacked("https://api.sandbox.game/lands/", uint2str(id), "/metadata.json"));
    }

    /**
     * @notice Check if the contract supports an interface
     * 0x01ffc9a7 is ERC-165
     * 0x80ac58cd is ERC-721
     * 0x5b5e139f is ERC-721 metadata
     * @param id The id of the interface
     * @return True if the interface is supported
     */
    function supportsInterface(bytes4 id) public pure override(AccessControl, ERC721BaseToken) returns (bool) {
        return id == 0x01ffc9a7 || id == 0x80ac58cd || id == 0x5b5e139f;
    }

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
        bool metaTx = msg.sender != from && (isTrustedForwarder(msg.sender) || hasRole(TRANSFER_ROLE, msg.sender));
        if (
            msg.sender != from &&
            (
                !metaTx /*|| !hasRole(TRANSFER_ROLE, msg.sender)*/
            )
        ) {
            require(
                _superOperators[msg.sender] || _operatorsForAll[from][msg.sender] || hasRole(TRANSFER_ROLE, msg.sender),
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

        _checkInterface(numTokensTransfered, from, to, sizes, xs, ys, data);
    }

    function _checkInterface(
        uint256 numTokensTransfered,
        address from,
        address to,
        uint256[] calldata sizes,
        uint256[] calldata xs,
        uint256[] calldata ys,
        bytes calldata data
    ) internal {
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
                _checkOnERC721BatchReceived(
                    /*metaTx ? from : msg.sender*/
                    from,
                    from,
                    to,
                    ids,
                    data
                ),
                "erc721 batch transfer rejected by to"
            );
        }
    }

    /*function calculateDigest(
        address from,
        address to,
        uint256[] calldata sizes,
        uint256[] calldata xs,
        uint256[] calldata ys,
        bytes calldata data
    ) internal returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    "\x19\x01",
                    _DOMAIN_SEPARATOR,
                    keccak256(
                        abi.encode(
                            keccak256(
                                //"batchTransferQuadII(address from, address to, uint256[] sizes, uint256[] xs, uint256[] ys, bytes data,)"
                                "BatchTransferQuadII(address from,address to,bytes sizes,bytes xs,bytes ys,bytes data)"
                                //, uint256[] calldata sizes, uint256[] calldata xs, uint256[] calldata ys, bytes calldata data,)"
                            ),
                            from,
                            to,
                            //sizes,
                            keccak256(abi.encodePacked(sizes)), //The array values are encoded as the keccak256 hash of the concatenated encodeData
                            //xs,
                            keccak256(abi.encodePacked(xs)),
                            //ys,
                            keccak256(abi.encodePacked(ys)),
                            keccak256(data) //the dynamic values bytes and string are encoded as a keccak256 hash of their contents.
                            //data
                        )
                    )
                )
            );
    }*/

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
        bool metaTx = msg.sender != from && isTrustedForwarder(msg.sender);
        if (msg.sender != from && !metaTx) {
            require(
                _superOperators[msg.sender] || _operatorsForAll[from][msg.sender],
                "not authorized to transferQuad"
            );
        }
        _transferQuad(from, to, size, x, y);
        _numNFTPerAddress[from] -= size * size;
        _numNFTPerAddress[to] += size * size;

        _checkBatchReceiverAcceptQuad(metaTx ? from : msg.sender, from, to, size, x, y, data);
    }

    function _transferQuad(
        address from,
        address to,
        uint256 size,
        uint256 x,
        uint256 y
    ) internal {
        if (size == 1) {
            uint256 id1x1 = x + y * GRID_SIZE;
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

    function _idInPath(
        uint256 i,
        uint256 size,
        uint256 x,
        uint256 y
    ) internal pure returns (uint256) {
        uint256 row = i / size;
        if (row % 2 == 0) {
            // alow ids to follow a path in a quad
            return (x + (i % size)) + ((y + row) * GRID_SIZE);
        } else {
            return ((x + size) - (1 + (i % size))) + ((y + row) * GRID_SIZE);
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

    function _regroup3x3(
        address from,
        address to,
        uint256 x,
        uint256 y,
        bool set
    ) internal returns (bool) {
        uint256 id = x + y * GRID_SIZE;
        uint256 quadId = LAYER_3x3 + id;
        bool ownerOfAll = true;
        for (uint256 xi = x; xi < x + 3; xi++) {
            for (uint256 yi = y; yi < y + 3; yi++) {
                ownerOfAll = _checkAndClear(from, xi + yi * GRID_SIZE) && ownerOfAll;
            }
        }
        if (set) {
            if (!ownerOfAll) {
                require(
                    _owners[quadId] == uint256(uint160(address(from))) ||
                        _owners[LAYER_6x6 + (x / 6) * 6 + ((y / 6) * 6) * GRID_SIZE] ==
                        uint256(uint160(address(from))) ||
                        _owners[LAYER_12x12 + (x / 12) * 12 + ((y / 12) * 12) * GRID_SIZE] ==
                        uint256(uint160(address(from))) ||
                        _owners[LAYER_24x24 + (x / 24) * 24 + ((y / 24) * 24) * GRID_SIZE] ==
                        uint256(uint160(address(from))),
                    "not owner of all sub quads nor parent quads"
                );
            }
            _owners[quadId] = uint256(uint160(address(to)));
            return true;
        }
        return ownerOfAll;
    }

    function _regroup6x6(
        address from,
        address to,
        uint256 x,
        uint256 y,
        bool set
    ) internal returns (bool) {
        uint256 id = x + y * GRID_SIZE;
        uint256 quadId = LAYER_6x6 + id;
        bool ownerOfAll = true;
        for (uint256 xi = x; xi < x + 6; xi += 3) {
            for (uint256 yi = y; yi < y + 6; yi += 3) {
                bool ownAllIndividual = _regroup3x3(from, to, xi, yi, false);
                uint256 id3x3 = LAYER_3x3 + xi + yi * GRID_SIZE;
                uint256 owner3x3 = _owners[id3x3];
                if (owner3x3 != 0) {
                    if (!ownAllIndividual) {
                        require(owner3x3 == uint256(uint160(address(from))), "not owner of 3x3 quad");
                    }
                    _owners[id3x3] = 0;
                }
                ownerOfAll = (ownAllIndividual || owner3x3 != 0) && ownerOfAll;
            }
        }
        if (set) {
            if (!ownerOfAll) {
                require(
                    _owners[quadId] == uint256(uint160(address(from))) ||
                        _owners[LAYER_12x12 + (x / 12) * 12 + ((y / 12) * 12) * GRID_SIZE] ==
                        uint256(uint160(address(from))) ||
                        _owners[LAYER_24x24 + (x / 24) * 24 + ((y / 24) * 24) * GRID_SIZE] ==
                        uint256(uint160(address(from))),
                    "not owner of all sub quads nor parent quads"
                );
            }
            _owners[quadId] = uint256(uint160(address(to)));
            return true;
        }
        return ownerOfAll;
    }

    function _regroup12x12(
        address from,
        address to,
        uint256 x,
        uint256 y,
        bool set
    ) internal returns (bool) {
        uint256 id = x + y * GRID_SIZE;
        uint256 quadId = LAYER_12x12 + id;
        bool ownerOfAll = true;
        for (uint256 xi = x; xi < x + 12; xi += 6) {
            for (uint256 yi = y; yi < y + 12; yi += 6) {
                bool ownAllIndividual = _regroup6x6(from, to, xi, yi, false);
                uint256 id6x6 = LAYER_6x6 + xi + yi * GRID_SIZE;
                uint256 owner6x6 = _owners[id6x6];
                if (owner6x6 != 0) {
                    if (!ownAllIndividual) {
                        require(owner6x6 == uint256(uint160(address(from))), "not owner of 6x6 quad");
                    }
                    _owners[id6x6] = 0;
                }
                ownerOfAll = (ownAllIndividual || owner6x6 != 0) && ownerOfAll;
            }
        }
        if (set) {
            if (!ownerOfAll) {
                require(
                    _owners[quadId] == uint256(uint160(address(from))) ||
                        _owners[LAYER_24x24 + (x / 24) * 24 + ((y / 24) * 24) * GRID_SIZE] ==
                        uint256(uint160(address(from))),
                    "not owner of all sub quads nor parent quads"
                );
            }
            _owners[quadId] = uint256(uint160(address(to)));
            return true;
        }
        return ownerOfAll;
    }

    function _regroup24x24(
        address from,
        address to,
        uint256 x,
        uint256 y,
        bool set
    ) internal returns (bool) {
        uint256 id = x + y * GRID_SIZE;
        uint256 quadId = LAYER_24x24 + id;
        bool ownerOfAll = true;
        for (uint256 xi = x; xi < x + 24; xi += 12) {
            for (uint256 yi = y; yi < y + 24; yi += 12) {
                bool ownAllIndividual = _regroup12x12(from, to, xi, yi, false);
                uint256 id12x12 = LAYER_12x12 + xi + yi * GRID_SIZE;
                uint256 owner12x12 = _owners[id12x12];
                if (owner12x12 != 0) {
                    if (!ownAllIndividual) {
                        require(owner12x12 == uint256(uint160(address(from))), "not owner of 12x12 quad");
                    }
                    _owners[id12x12] = 0;
                }
                ownerOfAll = (ownAllIndividual || owner12x12 != 0) && ownerOfAll;
            }
        }
        if (set) {
            if (!ownerOfAll) {
                require(
                    _owners[quadId] == uint256(uint160(address(from))),
                    "not owner of all sub quads not parent quad"
                );
            }
            _owners[quadId] = uint256(uint160(address(to)));
            return true;
        }
        return ownerOfAll || _owners[quadId] == uint256(uint160(address(from)));
    }

    function _ownerOf(uint256 id) internal view override returns (address) {
        require(id & LAYER == 0, "Invalid token id");
        uint256 x = id % GRID_SIZE;
        uint256 y = id / GRID_SIZE;
        uint256 owner1x1 = _owners[id];

        if (owner1x1 != 0) {
            return address(uint160(owner1x1)); //we check if the quad exists as an 1x1 quad, then 3x3, and so on..
        } else {
            address owner3x3 = address(uint160(_owners[LAYER_3x3 + (x / 3) * 3 + ((y / 3) * 3) * GRID_SIZE]));
            if (owner3x3 != address(0)) {
                return owner3x3;
            } else {
                address owner6x6 = address(uint160(_owners[LAYER_6x6 + (x / 6) * 6 + ((y / 6) * 6) * GRID_SIZE]));
                if (owner6x6 != address(0)) {
                    return owner6x6;
                } else {
                    address owner12x12 =
                        address(uint160(_owners[LAYER_12x12 + (x / 12) * 12 + ((y / 12) * 12) * GRID_SIZE]));
                    if (owner12x12 != address(0)) {
                        return owner12x12;
                    } else {
                        return address(uint160(_owners[LAYER_24x24 + (x / 24) * 24 + ((y / 24) * 24) * GRID_SIZE]));
                    }
                }
            }
        }
    }

    function _checkAndClear(address from, uint256 id) internal returns (bool) {
        uint256 owner = _owners[id];
        if (owner != 0) {
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

    /*uint256 internal constant LAYER_N3x3 = 0xFE00000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_N6x6 = 0xFD00000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_N12x12 = 0xFC00000000000000000000000000000000000000000000000000000000000000;
    uint256 internal constant LAYER_N24x24 = 0xFB00000000000000000000000000000000000000000000000000000000000000;

    function separate(uint256[] memory landIds)
        public
        returns (
            uint256[] memory,
            uint256[] memory,
            uint256[] memory
        )
    {
        uint256 numLds = landIds.length;

        uint256[] memory sizes = new uint256[](numLds);
        uint256[] memory xs = new uint256[](numLds);
        uint256[] memory ys = new uint256[](numLds);

        for (uint256 i = 0; i < numLds; i++) {
            if (landIds[i] & LAYER == 0) {
                sizes[i] = 1;
                xs[i] = (landIds[i]) % GRID_SIZE;
                ys[i] = landIds[i] / GRID_SIZE;
            } else if (landIds[i] & LAYER_N3x3 == 0) {
                sizes[i] = 3;
                xs[i] = (landIds[i] - LAYER_3x3) % GRID_SIZE;
                ys[i] = (landIds[i] - LAYER_3x3) / GRID_SIZE;
            } else if (landIds[i] & LAYER_N6x6 == 0) {
                sizes[i] = 6;
                xs[i] = (landIds[i] - LAYER_6x6) % GRID_SIZE;
                ys[i] = (landIds[i] - LAYER_6x6) / GRID_SIZE;
            } else if (landIds[i] & LAYER_N12x12 == 0) {
                sizes[i] = 12;
                xs[i] = (landIds[i] - LAYER_12x12) % GRID_SIZE;
                ys[i] = (landIds[i] - LAYER_12x12) / GRID_SIZE;
            } else if (landIds[i] & LAYER_N24x24 == 0) {
                sizes[i] = 24;
                xs[i] = (landIds[i] - LAYER_24x24) % GRID_SIZE;
                ys[i] = (landIds[i] - LAYER_24x24) / GRID_SIZE;
            }
        }

        return (sizes, xs, ys);
    }*/
}
