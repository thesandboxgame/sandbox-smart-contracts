//SPDX-License-Identifier: MIT
// solhint-disable code-complexity
pragma solidity 0.8.2;

import "../common/BaseWithStorage/ImmutableERC721.sol";
import "../common/interfaces/ILandToken.sol";
import "../Game/GameBaseToken.sol";
import "../common/interfaces/IERC721MandatoryTokenReceiver.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../libraries/UintToUintMap.sol";
import "../common/BaseWithStorage/WithMinter.sol";
import "@openzeppelin/contracts-0.8/utils/structs/EnumerableSet.sol";

/// @dev An updated Estate Token contract using a simplified verison of LAND with no Quads

contract EstateBaseToken is ImmutableERC721, Initializable, WithMinter {
    using EnumerableMap for EnumerableMap.UintToUintMap;
    using EnumerableSet for EnumerableSet.UintSet;
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
    mapping(uint256 => EnumerableMap.UintToUintMap) internal estates;
    // gamesToLands key = gameId, value = landIds
    mapping(uint256 => EnumerableSet.UintSet) internal gamesToLands;
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
    /// @dev Emits when a estate is updated.
    /// @param oldId The id of the previous erc721 ESTATE token.
    /// @param newId The id of the newly minted token.
    /// @param update The changes made to the Estate.
    event EstateTokenUpdated(uint256 indexed oldId, uint256 indexed newId, EstateCRUDData update);

    function initV1(
        address trustedForwarder,
        LandToken land,
        uint8 chainIndex
    ) public initializer() {
        _land = land;
        ERC721BaseToken.__ERC721BaseToken_initialize(chainIndex);
        ERC2771Handler.__ERC2771Handler_initialize(trustedForwarder);
    }

    // todo : restrict only for lands in size =1
    // todo: verify access control for all functions

    // @todo Add access-control: minter-only? could inherit WithMinter.sol
    /// @notice Create a new estate token with adjacent lands.
    /// @param from The address of the one creating the estate.
    /// @param to The address that will own the estate.
    /// @param creation The data to use to create the estate.
    function createEstate(
        address from,
        address to,
        EstateCRUDData calldata creation
    ) external returns (uint256) {
        _check_authorized(from, ADD);
        (uint256 estateId, uint256 storageId) = _mintEstate(from, to, _nextId++, 1, true);
        _metaData[storageId] = creation.uri;
        _addLandGames(from, storageId, creation.landIds, creation.gameIds, true);
        emit EstateTokenUpdated(0, estateId, creation);
        return estateId;
    }

    /// @notice lets the estate owner to add lands and/or add/remove games for these lands
    /// @param from The one updating the ESTATE token.
    /// @param to The address to transfer removed GAMES to.
    /// @param estateId The current id of the ESTATE token.
    /// @param update The data to use for the Estate update.
    /// @return The new estateId.
    function addLandsToEstate(
        address from,
        address to,
        uint256 estateId,
        EstateCRUDData memory update
    ) external returns (uint256) {
        _check_hasOwnerRights(from, estateId);
        uint256 storageId = _storageId(estateId);
        _metaData[storageId] = update.uri;
        _check_authorized(from, ADD);
        _addLandGames(from, storageId, update.landIds, update.gameIds, false);
        uint256 newId = _incrementTokenVersion(from, estateId);
        emit EstateTokenUpdated(estateId, newId, update);
        return newId;
    }

    /// @notice Used to remove lands from an estate.
    // @review do we need from? only needed when called by approved/superoperators...
    // @note see https://docs.google.com/document/d/1eXJP0Tp2C617kOkDNpLCS_hJXaGZizHkxJndMIlKpeQ/edit for offchain metadata solution
    /// @param from The address of the one removing lands.
    /// @param estateId The estate token to remove lands from.
    /// @param rebuild The data to use when reconstructing the Estate.
    /// @dev Note that a valid estate can only contain adjacent lands, so it is possible to attempt to remove lands in a way that would result in an invalid estate, which must be prevented.
    function removeLandsFromEstate(
        address from,
        uint256 estateId,
        EstateCRUDData memory rebuild
    ) external returns (uint256) {
        _check_hasOwnerRights(from, estateId);
        _check_authorized(from, ADD);
        uint256 storageId = _storageId(estateId);
        _removeLandsGames(from, storageId, rebuild.landIds);
        uint256 newId = _incrementTokenVersion(from, estateId);
        emit EstateTokenUpdated(estateId, newId, rebuild);
        return newId;
    }

    function setGamesOfLands(
        address from,
        address to,
        uint256 estateId,
        EstateCRUDData memory update
    ) external returns (uint256) {
        _check_hasOwnerRights(from, estateId);
        uint256 storageId = _storageId(estateId);
        _metaData[storageId] = update.uri;
        _check_authorized(from, ADD);
        _upsertGames(from, update.landIds, update.gameIds, storageId);
        uint256 newId = _incrementTokenVersion(from, estateId);
        emit EstateTokenUpdated(estateId, newId, update);
        return newId;
    }

    /// @notice Burns token `id`.
    /// @param id The token which will be burnt.
    function burn(uint256 id) public override {
        address sender = _msgSender();
        _check_authorized(sender, BREAK);
        _check_hasOwnerRights(sender, id);
        _burn(sender, _ownerOf(id), id);
    }

    /// @notice Burn token`id` from `from`.
    /// @param from address whose token is to be burnt.
    /// @param id The token which will be burnt.
    function burnFrom(address from, uint256 id) external override {
        require(from != address(uint160(0)), "NOT_FROM_ZERO_ADDRESS");
        (address owner, bool operatorEnabled) = _ownerAndOperatorEnabledOf(id);
        require(owner != address(uint160(0)), "NONEXISTENT_TOKEN");
        address msgSender = _msgSender();
        require(
            msgSender == from ||
                (operatorEnabled && _operators[id] == msgSender) ||
                _superOperators[msgSender] ||
                _operatorsForAll[from][msgSender],
            "UNAUTHORIZED_BURN"
        );
        _burn(from, owner, id);
    }

    /// @notice Used to recover Land tokens from a burned estate.
    /// Note: Implemented separately from burn to avoid hitting the block gas-limit if estate has too many lands.
    /// @param sender The sender of the request.
    // / @param to The recipient of the Land tokens.
    // / @param num The number of Lands to transfer.
    /// @param estateId The estate to recover lands from.
    function transferFromBurnedEstate(
        address sender,
        address to,
        uint256 estateId,
        uint256[] memory landsToRemove
    ) public {
        _check_authorized(sender, WITHDRAWAL);
        require(sender != address(this), "NOT_FROM_THIS");
        require(sender != address(uint160(0)), "NOT_FROM_ZERO");
        address msgSender = _msgSender();
        require(msgSender == sender || _superOperators[msgSender], "not _check_authorized");
        require(sender == _withdrawalOwnerOf(estateId), "NOT_WITHDRAWAL_OWNER");
        (address owner, ) = _ownerAndOperatorEnabledOf(estateId);
        // check that the estate has been burned
        uint256 strgId = _storageId(estateId);
        require(owner == address(0));
        _removeLandsGames(to, strgId, landsToRemove);
    }

    function burnAndTransferFromDestroyedEstate(
        uint256 id,
        address sender,
        address to,
        uint256 estateId,
        uint256[] memory landsToRemove
    ) external {
        burn(id);
        transferFromBurnedEstate(sender, to, estateId, landsToRemove);
    }

    function getEstateData(uint256 estateId) public view returns (EstateData memory) {
        uint256 storageId = _storageId(estateId);
        uint256 length = estates[storageId].length();
        uint256[] memory landIds = new uint256[](length);
        uint256[] memory gameIds = new uint256[](length);

        for (uint256 i = 0; i < length; i++) {
            (uint256 landId, uint256 gameId) = estates[storageId].at(i);
            landIds[i] = landId;
            gameIds[i] = gameId;
        }
        return EstateData({landIds: landIds, gameIds: gameIds});
    }

    function areLandsAdjacent(uint256[] memory landIds, uint256 landIdsSize) public view returns (bool) {
        uint256[] memory visitedLands = new uint256[](landIds.length);
        uint256[] memory stack = new uint256[](landIds.length);
        uint256 stackSize;
        uint256 visitedLandsSize;
        stack[stackSize] = landIds[stackSize];
        stackSize++;

        while (stackSize > 0) {
            uint256 landId = stack[stackSize - 1];
            stack[stackSize - 1] = 0;
            stackSize--;
            uint16 x = uint16(landId % GRID_SIZE);
            uint16 y = uint16(landId / GRID_SIZE);
            stackSize = _addUnvisitedAdjacentLands(x, y, landIds, visitedLands, stack, stackSize);
            visitedLands[visitedLandsSize] = landId;
            visitedLandsSize++;
        }
        return landIdsSize == visitedLandsSize;
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

    /// @notice Return the URI of a specific token.
    /// @param id The id of the token.
    /// @return uri The URI of the token metadata.
    function tokenURI(uint256 id) public view returns (string memory uri) {
        require(_ownerOf(id) != address(0), "BURNED_OR_NEVER_MINTED");
        uint256 immutableId = _storageId(id);
        return _toFullURI(_metaData[immutableId]);
    }

    // //////////////////////////////////////////////////////////////////////////////////////////////////////

    function _addUnvisitedAdjacentLands(
        uint16 x1,
        uint16 y1,
        uint256[] memory landIds,
        uint256[] memory visitedLands,
        uint256[] memory stack,
        uint256 stackSize
    ) internal pure returns (uint256) {
        // maximum of 4 adjacent lands is possible
        for (uint256 i = 0; i < landIds.length; i++) {
            if (landIds[i] == 0) {
                continue;
            }
            uint16 x2 = uint16(landIds[i] % GRID_SIZE);
            uint16 y2 = uint16(landIds[i] / GRID_SIZE);
            if (_areAdjacent(x1, y1, x2, y2) && !isLandVisited(landIds[i], visitedLands)) {
                stack[stackSize] = landIds[i];
                stackSize++;
            }
        }
        return stackSize;
    }

    function isLandVisited(uint256 landId, uint256[] memory visitedLands) internal pure returns (bool) {
        for (uint256 i = 0; i < visitedLands.length; i++) {
            if (visitedLands[i] == landId) {
                return true;
            }
        }
        return false;
    }

    function _addLandGames(
        address sender,
        uint256 storageId,
        uint256[] memory landIdsToAdd,
        uint256[] memory gameIds,
        bool justCreated
    ) internal {
        // land ids are in the event emitted
        // lands without games will be represented as gameId = 0
        // todo: length could be manipulated by user
        require(landIdsToAdd.length == gameIds.length, "DIFFERENT_LENGTH_LANDS_GAMES");
        require(landIdsToAdd.length > 0, "EMPTY_LAND_IDS_ARRAY");
        uint256[] memory newLands;
        if (justCreated) {
            newLands = landIdsToAdd;
        } else {
            EstateData memory ed = getEstateData(storageId);
            newLands = new uint256[](landIdsToAdd.length + ed.landIds.length);
            for (uint256 i = 0; i < newLands.length; i++) {
                if (i < landIdsToAdd.length) {
                    require(landIdsToAdd[i] != 0, "NO_ZERO_LAND_IDS");
                    newLands[i] = landIdsToAdd[i];
                } else {
                    require(ed.landIds[i - landIdsToAdd.length] != 0, "NO_ZERO_LAND_IDS");
                    newLands[i] = ed.landIds[i - landIdsToAdd.length];
                }
            }
        }
        require(areLandsAdjacent(newLands, newLands.length), "LANDS_ARE_NOT_ADJACENT");

        uint256[] memory gamesToAdd = new uint256[](gameIds.length);
        for (uint256 i = 0; i < landIdsToAdd.length; i++) {
            estates[storageId].set(landIdsToAdd[i], gameIds[i]);
            if (gameIds[i] != 0) {
                gamesToAdd[i] = gameIds[i];
                gamesToLands[gameIds[i]].add(landIdsToAdd[i]);
            }
        }
        if (landIdsToAdd.length > 0) {
            _land.batchTransferFrom(sender, address(this), landIdsToAdd, "");
        }
        if (gamesToAdd.length > 0) {
            _gameToken.batchTransferFrom(sender, address(this), gamesToAdd, "");
        }
    }

    function _removeLandsGames(
        address to,
        uint256 storageId,
        uint256[] memory landsToRemove
    ) internal {
        EstateData memory ed = getEstateData(storageId);
        uint256 removedLandsCounter;
        for (uint256 k = 0; k < ed.landIds.length; k++) {
            for (uint256 l = 0; l < landsToRemove.length; l++) {
                if (ed.landIds[k] == landsToRemove[l]) {
                    ed.landIds[k] = 0;
                    removedLandsCounter++;
                }
            }
        }
        require(areLandsAdjacent(ed.landIds, ed.landIds.length - removedLandsCounter), "LANDS_ARE_NOT_ADJACENT");
        uint256 length = landsToRemove.length;
        uint256[] memory gameIdsToRemove = new uint256[](length);
        for (uint256 i = 0; i < length; i++) {
            uint256 gameId = estates[storageId].get(landsToRemove[i]);
            if (gameId != 0) {
                gameIdsToRemove[i] = gameId;
                gamesToLands[gameId].remove(landsToRemove[i]);
            }
            require(estates[storageId].remove(landsToRemove[i]), "LAND_NOT_EXIST");
        }
        // a game should be removed only if all lands that attached to it are being removed too
        for (uint256 j = 0; j < gameIdsToRemove.length; j++) {
            require(gamesToLands[gameIdsToRemove[j]].length() == 0);
        }
        _land.batchTransferFrom(address(this), to, landsToRemove, "");
        _gameToken.batchTransferFrom(address(this), to, gameIdsToRemove, "");
    }

    function _upsertLandsGames(
        address sender,
        uint256[] memory landIds,
        uint256[] memory gameIds,
        uint256 storageId
    ) internal {
        uint256[] memory gamesToAdd = new uint256[](gameIds.length);
        for (uint256 i = 0; i < landIds.length; i++) {
            estates[storageId].set(landIds[i], gameIds[i]);
            if (gameIds[i] != 0) {
                gamesToAdd[i] = gameIds[i];
                gamesToLands[gameIds[i]].add(landIds[i]);
            }
        }
        if (landIds.length > 0) {
            _land.batchTransferFrom(sender, address(this), landIds, "");
        }
        if (gamesToAdd.length > 0) {
            _gameToken.batchTransferFrom(sender, address(this), gamesToAdd, "");
        }
    }

    function _upsertGames(
        address sender,
        uint256[] memory landIds,
        uint256[] memory gameIds,
        uint256 storageId
    ) internal {
        uint256[] memory gamesToRemove = new uint256[](gameIds.length);
        uint256[] memory gamesToAdd = new uint256[](gameIds.length);
        for (uint256 i = 0; i < landIds.length; i++) {
            // revert if land does not exist
            uint256 oldGameId = estates[storageId].get(landIds[i]);
            estates[storageId].set(landIds[i], gameIds[i]);
            if (oldGameId != 0) {
                gamesToRemove[i] = oldGameId;
            }
            if (gameIds[i] != 0) {
                gamesToAdd[i] = gameIds[i];
                gamesToLands[gameIds[i]].add(landIds[i]);
            }
        }
        if (gamesToAdd.length > 0) {
            _gameToken.batchTransferFrom(sender, address(this), gamesToAdd, "");
        }
        if (gamesToRemove.length > 0) {
            _gameToken.batchTransferFrom(address(this), sender, gamesToRemove, "");
        }
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
        assert(owner == newOwner);
        return newId;
    }

    function _check_authorized(address sender, uint8 action) internal view {
        require(sender != address(uint160(0)), "sender is zero address");
        address msgSender = _msgSender();
        if (action == ADD) {
            address minter = _minter;
            require(msgSender == minter || msgSender == sender, "UNAUTHORIZED_ADD");
        } else {
            require(msgSender == sender, "not _check_authorized");
        }
    }

    function _check_hasOwnerRights(address sender, uint256 estateId) internal view {
        (address owner, bool operatorEnabled) = _ownerAndOperatorEnabledOf(estateId);
        require(owner != address(uint160(0)), "token does not exist");
        require(owner == sender, "not owner");
        address msgSender = _msgSender();
        require(
            _superOperators[msgSender] ||
                _operatorsForAll[sender][msgSender] ||
                (operatorEnabled && _operators[estateId] == msgSender),
            "not approved"
        );
    }

    // //////////////////////////////////////////////////////////////////////////////////////////////////////////

    function _encode(
        uint16 x,
        uint16 y,
        uint8 size
    ) internal pure returns (uint24) {
        return uint24(size) * uint24(2**18) + (uint24(x) + uint24(y) * GRID_SIZE);
    }

    function _decode(uint24 data)
        internal
        pure
        returns (
            uint16 x,
            uint16 y,
            uint8 size
        )
    {
        size = uint8(data / (2**18));
        y = uint16((data % (2**18)) / GRID_SIZE);
        x = uint16(data % GRID_SIZE);
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
        require(to != address(uint160(0)), "can't send to zero address");
        uint16 idVersion;
        uint256 estateId;
        uint256 strgId;
        if (isCreation) {
            idVersion = 1;
            estateId = _generateTokenId(from, subId, _chainIndex, idVersion);
            strgId = _storageId(estateId);
            require(_owners[strgId] == 0, "STORAGE_ID_REUSE_FORBIDDEN");
        } else {
            estateId = _generateTokenId(from, subId, _chainIndex, version);
            strgId = _storageId(estateId);
        }

        _owners[strgId] = (uint256(idVersion) << 200) + uint256(uint160(to));
        _numNFTPerAddress[to]++;
        emit Transfer(address(0), to, estateId);
        return (estateId, strgId);
    }

    function _areAdjacent(
        uint16 x1,
        uint16 y1,
        uint16 x2,
        uint16 y2
    ) internal pure returns (bool) {
        return ((x1 == x2 && y1 == y2 - 1) ||
            (x1 == x2 && y1 == y2 + 1) ||
            (x1 == x2 - 1 && y1 == y2) ||
            (x1 == x2 + 1 && y1 == y2));
    }

    // ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    function onERC721BatchReceived(
        address, // operator,
        address, // from,
        uint256[] calldata, // ids,
        bytes calldata // data
    ) external pure returns (bytes4) {
        revert("please call createEstate or updateEstate functions");
    }

    function onERC721Received(
        address, // operator,
        address, // from,
        uint256, // tokenId,
        bytes calldata // data
    ) external pure returns (bytes4) {
        revert("please call createEstate or updateEstate functions");
    }

    /// @dev Get the a full URI string for a given hash + gameId.
    /// @param hash The 32 byte IPFS hash.
    /// @return The URI string.
    function _toFullURI(bytes32 hash) internal pure override returns (string memory) {
        return string(abi.encodePacked("ipfs://bafybei", hash2base32(hash), "/", "estate.json"));
    }

    // solhint-enable code-complexity
}
