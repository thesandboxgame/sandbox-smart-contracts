// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "../common/BaseWithStorage/ImmutableERC721.sol";
import "../common/interfaces/ILandToken.sol";
import "../common/interfaces/IERC721MandatoryTokenReceiver.sol";
import "../common/BaseWithStorage/WithMinter.sol";
import "../common/Libraries/MapLib.sol";
import "../common/interfaces/IEstateToken.sol";

/// @dev An updated Estate Token contract using a simplified verison of LAND with no Quads
contract EstateBaseToken is ImmutableERC721, WithMinter, IEstateToken {
    using MapLib for MapLib.Map;

    uint8 public constant OWNER = 0;
    uint8 public constant ADD = 1;
    uint8 public constant BREAK = 2;
    uint8 public constant WITHDRAWAL = 3;
    uint16 public constant GRID_SIZE = 408;
    uint64 public _nextId; // max uint64 = 18,446,744,073,709,551,615

    ILandToken public _land;

    mapping(uint256 => bytes32) internal _metaData;

    mapping(uint256 => uint256) public quadMap;

    // estate id => free lands
    mapping(uint256 => MapLib.Map) freeLands;


    /// @dev Emits when a estate is updated.
    /// @param oldId The id of the previous erc721 ESTATE token.
    /// @param newId The id of the newly minted token.
    /// @param update The changes made to the Estate.
    event EstateTokenUpdated(uint256 indexed oldId, uint256 indexed newId, IEstateToken.EstateCRUDData update);

    /// @dev Emits when a estate is updated.
    /// @param oldId The id of the previous erc721 ESTATE token.
    /// @param newId The id of the newly minted token.
    /// @param update The changes made to the Estate.
    event EstateTokenUpdatedII(uint256 indexed oldId, uint256 indexed newId, IEstateToken.UpdateEstateLands update);

    function _unchained_initV1(
        address trustedForwarder,
        address admin,
        ILandToken land,
        uint8 chainIndex
    ) internal {
        ImmutableERC721.__ImmutableERC721_initialize(chainIndex);
        ERC2771Handler.__ERC2771Handler_initialize(trustedForwarder);
        _admin = admin;
        _land = land;
        // start quad map
        quadMap[1] = 1;
        quadMap[3] = 2 ** 3 - 1;
        quadMap[6] = 2 ** 6 - 1;
        quadMap[12] = 2 ** 12 - 1;
        quadMap[24] = 2 ** 24 - 1;
    }

    // @todo Add access-control: minter-only? could inherit WithMinter.sol, the game token creator is minter only
    /// @notice Create a new estate token with lands.
    /* /// @param from The address of the one creating the estate.
    /// @param to The address that will own the estate. */
    /// @param creation The data to use to create the estate.
    function createEstate(address from, IEstateToken.EstateCRUDData calldata creation)
    external
    override
    onlyMinter()
    returns (uint256)
    {
        (uint256 estateId, uint256 storageId) = _mintEstate(from, _nextId++, 1, true);
        _metaData[storageId] = creation.uri;
        _addLands(from, storageId, creation.quadTuple);
        emit EstateTokenUpdated(0, estateId, creation);
        return estateId;
    }

    function updateLandsEstate(address from, IEstateToken.UpdateEstateLands calldata update)
    external
    override
    onlyMinter()
    returns (uint256)
    {
        if (update.quadsToAdd[0].length > 0) {
            _addLands(from, update.estateId, update.quadsToAdd);
        }
        if (update.quadsToRemove[0].length > 0) {
            _removeLands(from, update.estateId, update.quadsToRemove);
        }

        uint256 newId = _incrementTokenVersion(from, update.estateId);
        emit EstateTokenUpdatedII(update.estateId, newId, update);
        return newId;
    }

    function freeLandLength(uint256 estateId) external view returns (uint256) {
        uint256 storageId = _storageId(estateId);
        return freeLands[storageId].length();
    }

    function freeLandAt(
        uint256 estateId,
        uint256 offset,
        uint256 limit
    ) external view returns (TileWithCoordLib.TileWithCoord[] memory) {
        uint256 storageId = _storageId(estateId);
        return freeLands[storageId].at(offset, limit);
    }

    function freeLand(uint256 estateId) external view returns (TileWithCoordLib.TileWithCoord[] memory) {
        uint256 storageId = _storageId(estateId);
        return freeLands[storageId].getMap();
    }

    /// @notice Return the name of the token contract.
    /// @return The name of the token contract.
    function name() external pure returns (string memory) {
        return "The Sandbox: ESTATE token";
    }

    /// @notice Get the symbol of the token contract.
    /// @return the symbol of the token contract.
    function symbol() external pure returns (string memory) {
        return "ESTATE";
    }

    function onERC721Received(
        address, /*operator*/
        address, /*from*/
        uint256, /*id*/
        bytes calldata /*data*/
    ) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }

    function onERC721BatchReceived(
        address, /*operator*/
        address, /*from*/
        uint256[] calldata, /*ids*/
        bytes calldata /*data*/
    ) external pure returns (bytes4) {
        return this.onERC721BatchReceived.selector;
    }


    function _addLands(
        address sender,
        uint256 storageId,
        uint256[][3] memory quadTuple
    ) internal {
        require(quadTuple[0].length > 0, "EMPTY_LAND_IDS_ARRAY");
        _land.batchTransferQuad(sender, address(this), quadTuple[0], quadTuple[1], quadTuple[2], "");
        _addLandsMapping(storageId, quadTuple);
    }

    function _removeLands(
        address sender,
        uint256 storageId,
        uint256[][3] memory quadTuple
    ) internal {
        require(quadTuple[0].length > 0, "EMPTY_LAND_IDS_ARRAY");
        _removeLandsMapping(storageId, quadTuple);
        _land.batchTransferQuad(address(this), sender, quadTuple[0], quadTuple[1], quadTuple[2], "");
    }

    function _addLandsMapping(
    //maybe I can unify both with a bool isCreation
        uint256 storageId,
        uint256[][3] memory quads
    ) internal {
        MapLib.Map storage newMap = freeLands[storageId];
        for (uint256 i; i < quads[0].length; i++) {
            newMap.setQuad(quads[1][i], quads[2][i], quads[0][i], _quadMask);
        }
    }

    function _removeLandsMapping(
    //maybe I can unify both with a bool isCreation
        uint256 storageId,
        uint256[][3] memory quads
    ) internal {
        MapLib.Map storage newMap = freeLands[storageId];
        for (uint256 i; i < quads[0].length; i++) {
            newMap.clearQuad(quads[1][i], quads[2][i], quads[0][i], _quadMask);
        }
    }

    function _quadMask(uint256 size) internal view returns (uint256) {
        return quadMap[size];
    }

    /// @dev used to increment the version in a tokenId by burning the original and reminting a new token. Mappings to token-specific data are preserved via the storageId mechanism.
    /// @param from The address of the token owner.
    /// @param estateId The tokenId to increment.
    /// @return the version-incremented tokenId.
    function _incrementTokenVersion(address from, uint256 estateId) internal returns (uint256) {
        // address originalCreator = address(uint160(estateId / CREATOR_OFFSET_MULTIPLIER));

        uint64 subId = uint64(estateId / SUBID_MULTIPLIER);
        uint16 version = uint16(estateId);
        version++;
        address owner = _ownerOf(estateId);

        if (from == owner) {
            _burn(from, owner, estateId);
        }
        (uint256 newId,) = _mintEstate(owner, subId, version, false);
        address newOwner = _ownerOf(newId);
        require(owner == newOwner, "NOT_OWNER");
        return newId;
    }

    /// @dev Create a new (or incremented) estateId and associate it with an owner.
    /// @param from The address of the Estate owner.
    /// @param subId The id to use when generating the new estateId.
    /// @param version The version number part of the estateId.
    /// @param isCreation Whether this is a brand new Estate (as opposed to an update).
    /// @return id The newly created estateId.
    /// @return storageId The staorage Id for the token.
    function _mintEstate(
        address from,
    //address to,
        uint64 subId,
        uint16 version,
        bool isCreation
    ) internal returns (uint256, uint256 storageId) {
        //require(to != address(uint160(0)), "CANNOT_SEND_TO_ZERO_ADDRESS");
        uint16 idVersion;
        uint256 estateId;

        uint256 strgId;

        if (isCreation) {
            idVersion = 1;
            estateId = _generateTokenId(from, subId, _chainIndex, idVersion);
            strgId = _storageId(estateId);
            require(_owners[strgId] == 0, "STORAGE_ID_REUSE_FORBIDDEN");
        } else {
            idVersion = version;
            estateId = _generateTokenId(from, subId, _chainIndex, idVersion);
            strgId = _storageId(estateId);
        }

        _owners[strgId] = (uint256(idVersion) << 200) + uint256(uint160(from));
        _numNFTPerAddress[from]++;
        emit Transfer(address(0), from, estateId);
        return (estateId, strgId);
    }

    function _check_authorized(address sender, uint8 action) internal view {
        require(sender != address(uint160(0)), "SENDER_IS_ZERO_ADDRESS");
        address msgSender = _msgSender();
        if (action == ADD) {
            address minter = _minter;
            require(msgSender == minter || msgSender == sender, "UNAUTHORIZED_ADD");
        } else {
            require(msgSender == sender, "NOT_AUTHORIZED");
        }
    }

    function _check_hasOwnerRights(address sender, uint256 estateId) internal view {
        (address owner, bool operatorEnabled) = _ownerAndOperatorEnabledOf(estateId);

        require(owner != address(uint160(0)), "TOKEN_DOES_NOT_EXIST");

        address msgSender = _msgSender();

        require(
            owner == sender ||
            _superOperators[msgSender] ||
            _operatorsForAll[sender][msgSender] ||
            (operatorEnabled && _operators[estateId] == msgSender),
            "NOT_APPROVED"
        );
    }

    /// @dev Get the a full URI string for a given hash + gameId.
    /// @param hash The 32 byte IPFS hash.
    /// @return The URI string.
    function _toFullURI(bytes32 hash) internal pure override returns (string memory) {
        return string(abi.encodePacked("ipfs://bafybei", hash2base32(hash), "/", "estate.json"));
    }

}
