//SPDX-License-Identifier: MIT
// solhint-disable code-complexity
pragma solidity 0.8.2;

import "../common/BaseWithStorage/ImmutableERC721.sol";
import "../common/interfaces/ILandToken.sol";
import "../Game/GameBaseToken.sol";
import "../common/interfaces/IERC721MandatoryTokenReceiver.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../common/Libraries/UintToUintMap.sol";
import "../common/BaseWithStorage/WithMinter.sol";
import "@openzeppelin/contracts-0.8/utils/structs/EnumerableSet.sol";
import "hardhat/console.sol";

/// @dev An updated Estate Token contract using a simplified verison of LAND with no Quads

contract EstateBaseToken2 is ImmutableERC721, Initializable, WithMinter {
    using EnumerableMap for EnumerableMap.UintToUintMap;
    uint8 internal constant OWNER = 0;
    uint8 internal constant ADD = 1;
    uint8 internal constant BREAK = 2;
    uint8 internal constant WITHDRAWAL = 3;
    uint16 internal constant GRID_SIZE = 408;
    uint64 internal _nextId; // max uint64 = 18,446,744,073,709,551,615
    mapping(uint256 => bytes32) internal _metaData;

    // estates key = storageId
    // EnumerableMap.UintToUintMap keys = land ids
    // EnumerableMap.UintToUintMap values = game ids
    //map to a map
    mapping(uint256 => EnumerableMap.UintToUintMap) internal estates;

    LandToken internal _land;
    GameBaseToken internal _gameToken;

    /// @param landIds LAND tokenIds added, Games added, Games removed, uri
    /// @param gameId Games added
    /// @param uri ipfs hash (without the prefix, assume cidv1 folder)
    struct EstateCRUDData {
        uint256[] landIds;
        uint256[] gameIds;
        bytes32 uri;
    }
    struct EstateData {
        uint256[] landIds;
        uint256[] gameIds;
    }

    struct UpdateEstateData {
        uint256[][] landAndGameAssociations;
        //uint256[] lansdIdsToAdd;
        uint256[] gameIdsToAdd;
        uint256[] landIdsToRemove;
        uint256[] gameIdsToRemove;
        bytes32 uri;
    }

    /// @dev Emits when a estate is updated.
    /// @param oldId The id of the previous erc721 ESTATE token.
    /// @param newId The id of the newly minted token.
    /// @param update The changes made to the Estate.
    event EstateTokenUpdated(uint256 indexed oldId, uint256 indexed newId, UpdateEstateData update);

    /// @dev Emits when a estate is updated.
    /// @param oldId The id of the previous erc721 ESTATE token.
    /// @param newId The id of the newly minted token.
    /// @param update The changes made to the Estate.
    event EstateTokenUpdatedII(uint256 indexed oldId, uint256 indexed newId, UpdateEstateData update);

    function initV1(
        address trustedForwarder,
        LandToken land,
        GameBaseToken gameToken,
        uint8 chainIndex
    ) public initializer() {
        _gameToken = gameToken;
        _land = land;
        ERC721BaseToken.__ERC721BaseToken_initialize(chainIndex);
    }

    // @todo Add access-control: minter-only? could inherit WithMinter.sol, the game token creator is minter only
    /// @notice Create a new estate token with lands.
    /// @param from The address of the one creating the estate.
    /// @param to The address that will own the estate.
    /// @param creation The data to use to create the estate.

    //creation
    //loop on landsToAdd -> creation of element estate[storageId] => (landId, 0)
    //(L1,G1),(L2,G1),(L3,G1),(L4,G2)
    //(L1,L2,L3,L4)
    //(G1,G2)

    function helloWorld(
        address from,
        address to,
        UpdateEstateData calldata creation
    ) external returns (uint256) {
        (uint256 estateId, uint256 storageId) = _mintEstate(from, to, _nextId++, 1, true);
        for (uint256 i = 0; i < creation.landAndGameAssociations[0].length; i++) {
            estates[storageId].set(creation.landAndGameAssociations[0][i], creation.landAndGameAssociations[1][i]);
            //console.log(creation.landAndGameAssociations[0][i]);
            //console.log(creation.landAndGameAssociations[1][i]);
        }

        (uint256[] memory sizes, uint256[] memory xs, uint256[] memory ys) =
            _separateId(creation.landAndGameAssociations[0]);
        //require _gameToken.landsNumber(gameId) == creation.landAndGameAssociations[0].length
        _land.batchTransferQuad(from, address(this), sizes, xs, ys, "");
        _gameToken.batchTransferFrom(from, address(this), creation.gameIdsToAdd, "");
        return 3;
    }

    function createEstate(
        address from,
        address to,
        UpdateEstateData calldata creation
    ) external returns (uint256) {
        /* require(
            creation.landAndGameAssociations[0].length == creation.landAndGameAssociations[1].length,
            "DIFFERENT_LENGTH_LANDS_GAMES"
        );
        require(creation.landAndGameAssociations[0].length > 0, "EMPTY_LAND_IDS_ARRAY");

        _check_authorized(from, ADD);
         */
        (uint256 estateId, uint256 storageId) = _mintEstate(from, to, _nextId++, 1, true);
        /* _metaData[storageId] = creation.uri;
         */

        for (uint256 i = 0; i < creation.landAndGameAssociations.length; i++) {
            estates[storageId].set(creation.landAndGameAssociations[0][i], creation.landAndGameAssociations[1][i]);
        }

        //final transfer
        /* (uint256[] memory sizes, uint256[] memory xs, uint256[] memory ys) =
            _separateId(creation.landAndGameAssociations[0]);



        _land.batchTransferQuad(from, address(this), sizes, xs, ys, "");
        _gameToken.batchTransferFrom(from, address(this), creation.gameIdsToAdd, "");
 */
        //emit EstateTokenUpdated(0, estateId, creation);
        return estateId;
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

    function _separateId(
        uint256[] memory landIds //sizes are always 1
    )
        internal
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
            sizes[i] = 1;
            xs[i] = _land.x(landIds[i]);
            ys[i] = _land.y(landIds[i]);
        }
        return (sizes, xs, ys);
    }

    /// @dev used to increment the version in a tokenId by burning the original and reminting a new token. Mappings to token-specific data are preserved via the storageId mechanism.
    /// @param from The address of the token owner.
    /// @param estateId The tokenId to increment.
    /// @return the version-incremented tokenId.
    function _incrementTokenVersion(address from, uint256 estateId) internal returns (uint256) {
        address originalCreator = address(uint160(estateId / CREATOR_OFFSET_MULTIPLIER));
        uint64 subId = uint64(estateId / SUBID_MULTIPLIER);
        uint16 version = uint16(estateId);
        version++;
        address owner = _ownerOf(estateId);
        if (from == owner) {
            _burn(from, owner, estateId);
        }
        (uint256 newId, ) = _mintEstate(originalCreator, owner, subId, version, false);
        address newOwner = _ownerOf(newId);
        require(owner == newOwner, "NOT_OWNER");
        return newId;
    }

    /// @dev Create a new (or incremented) estateId and associate it with an owner.
    /// @param from The address of one creating the Estate.
    /// @param to The address of the Estate owner.
    /// @param subId The id to use when generating the new estateId.
    /// @param version The version number part of the estateId.
    /// @param isCreation Whether this is a brand new Estate (as opposed to an update).
    /// @return id The newly created estateId.
    /// @return storageId The staorage Id for the token.
    function _mintEstate(
        address from,
        address to,
        uint64 subId,
        uint16 version,
        bool isCreation
    ) internal returns (uint256, uint256 storageId) {
        require(to != address(uint160(0)), "CAN'T_SEND_TO_ZERO_ADDRESS");
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

        _owners[strgId] = (uint256(idVersion) << 200) + uint256(uint160(to));
        _numNFTPerAddress[to]++;
        emit Transfer(address(0), to, estateId);
        return (estateId, strgId);
    }
}
