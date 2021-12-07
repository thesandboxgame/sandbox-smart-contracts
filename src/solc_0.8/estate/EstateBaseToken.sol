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
    //map to a map
    mapping(uint256 => EnumerableMap.UintToUintMap) internal estates;

    // gamesToLands key = gameId, value = landIds
    mapping(uint256 => EnumerableSet.UintSet) internal gamesToLands;
    //yes we can have multiple lands per games
    //I wonder why use sets
    //what's the impact on gas

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

    //this is a new struct that I was working for the update
    //landAndGameAssociations would be the landid and the corresponding gameId
    struct UpdateEstateData {
        uint256[][] landAndGameAssociations;
        uint256[] gameIdsToAdd;
        uint256[] landIdsToRemove;
        uint256[] gameIdsToRemove;
        bytes32 uri;
    }

    /// @dev Emits when a estate is updated.
    /// @param oldId The id of the previous erc721 ESTATE token.
    /// @param newId The id of the newly minted token.
    /// @param update The changes made to the Estate.
    event EstateTokenUpdated(uint256 indexed oldId, uint256 indexed newId, EstateCRUDData update);

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
    function createEstate(
        address from,
        address to,
        EstateCRUDData calldata creation
    ) external returns (uint256) {
        _check_authorized(from, ADD);
        (uint256 estateId, uint256 storageId) = _mintEstate(from, to, _nextId++, 1, true);
        _metaData[storageId] = creation.uri;
        _addLandsGames(from, storageId, creation.landIds, creation.gameIds, true);
        emit EstateTokenUpdated(0, estateId, creation);
        return estateId;
    }

    //this is the update function that I was working on, it is still incomplete
    /* function updateEstate(
        address from,
        address to,
        uint256 estateId,
        UpdateEstateData memory update
    ) external returns (uint256) {
        _check_hasOwnerRights(from, estateId);
        uint256 storageId = _storageId(estateId);
        _metaData[storageId] = update.uri;
        _check_authorized(from, ADD);

        if (update.landAndGameAssociations.length > 0) {
            uint256[] memory landsToAdd = new uint256[](update.landAndGameAssociations.length);
            // uint256[] memory gamesToAdd = new uint256[](update.landAndGameAssociations.length); //this shoukd be a =/= size
            (
                landsToAdd //, gamesToAdd
            ) = compareAndAdd(storageId, update.landAndGameAssociations);
            //need to implement this

            if (landsToAdd.length > 0) {
                _land.batchTransferFrom(from, address(this), landsToAdd, "");
            }
            if (update.gameIdsToAdd.length > 0) {
                //uint256[] memory filteredGames = filterArray(gamesToAdd);
                _gameToken.batchTransferFrom(from, address(this), update.gameIdsToAdd, "");
            }
        }

        if (update.gameIdsToRemove.length > 0) {
            _removeGamesAndLands(storageId, update.landIdsToRemove, update.gameIdsToRemove);
            //_gameToken.batchTransferFrom(address(this), from, update.gameIdsToRemove, "");
        }

        if (update.landIdsToRemove.length > 0) {
            //Verify that we're not leaving unlinked games

            //uint256[] memory gameIdsToRemove;
            //(gameIdsToRemove, ) = _setGamesOfLands(storageId, landsToRemove, new uint256[](landsToRemove.length), true);

            //if (!isBurned(estateId)) {
                //for (uint256 j = 0; j < gameIdsToRemove.length; j++) {
                    //require(gamesToLands[gameIdsToRemove[j]].length() == 0, "GAME_IS_ATTACHED_TO_OTHER_LANDS");
                //}
            //}

            _land.batchTransferFrom(address(this), from, update.landIdsToRemove, "");
        }

        uint256 newId = _incrementTokenVersion(to, estateId);
        console.log("what is old estate id here ");
        console.log(estateId);
        console.log("what is new estate id here ");
        console.log(newId);
        emit EstateTokenUpdatedII(estateId, newId, update);
        return newId;
    } */

    //function to remove games and lands
    /* function _removeGamesAndLands(
        uint256 storageId,
        uint256[] memory landIdsToRemove,
        uint256[] memory gamesIdsToRemove
    ) public {
        console.log("are we entering _removeGamesAndLands");

        uint256[] memory landsFromGames;

        for (uint256 i = 0; i < gamesIdsToRemove.length; i++) {
            landsFromGames = getLandsForGame(gamesIdsToRemove[i]);

            for (uint256 j = 0; j < landsFromGames.length; j++) {
                //console.log(landsFromGames[j]);
                if (isItInArray(landsFromGames[j], landIdsToRemove)) {
                    //console.log("hihi");
                }
            }
            delete (gamesToLands[gamesIdsToRemove[i]]);

            //use getLandsForGame

            //had to erease from estates as well
            //estates[storageId].set(landAndGameAssociations[i][0], gameId);

            //check if there are lands, and if they are on lands to remove

            //if they are remove from map
            //

            //I dont need to take off lands
        }
    } */

    // in case of multiple lands associated with a single game, these lands should be ordered by their common game token.
    // for example, let's assume we have an estate with these lands and games : [L1,L2,L3]
    // gameIds = [G1,G1,G2] will work,
    // but gameIds = [G1,G2,G1] will not.
    /* function compareAndAdd(uint256 storageId, uint256[2][] memory landAndGameAssociations)
        internal
        returns (
            uint256[] memory landsToAdd //, uint256[] memory gamesToAdd
        )
    {
        landsToAdd = new uint256[](landAndGameAssociations.length);
        //gamesToAdd = new uint256[](landAndGameAssociations.length); //this shoukd be a =/= size

        for (uint256 i = 0; i < landAndGameAssociations.length; i++) {
            uint256 gameId = landAndGameAssociations[i][1];
            (bool landInTable, uint256 oldGameId) = estates[storageId].tryGet(landAndGameAssociations[i][0]);

            if (landInTable) {
                //land in table
                if (gameId != oldGameId) {
                    //not the same game game

                    //removing from table
                    require(estates[storageId].remove(landAndGameAssociations[i][0]), "LAND_DOES_NOT_EXIST");
                    gamesToLands[oldGameId].remove(landAndGameAssociations[i][0]);

                    //adding
                    estates[storageId].set(landAndGameAssociations[i][0], gameId);
                    gamesToLands[gameId].add(landAndGameAssociations[i][0]);

                    //add in tables to add
                    // gamesToAdd[i] = gameId;
                }
            } else {
                //land not in table
                //add land and game
                estates[storageId].set(landAndGameAssociations[i][0], gameId);
                gamesToLands[gameId].add(landAndGameAssociations[i][0]);
                //add in tables to add
                landsToAdd[i] = landAndGameAssociations[i][0];
                //gamesToAdd[i] = gameId;
            }
        }
    }
 */
    /// @notice lets the estate owner add lands and/or add/remove games for these lands
    /// @param from The one updating the ESTATE token.
    /// @param to The address to transfer removed GAMES to.
    /// @param estateId The current id of the ESTATE token.
    /// @param update The data to use for the Estate update.
    /// @return The new estateId.
    function addLandsGamesToEstate(
        address from,
        address to,
        uint256 estateId,
        EstateCRUDData memory update
    ) external returns (uint256) {
        _check_hasOwnerRights(from, estateId);
        uint256 storageId = _storageId(estateId);
        _metaData[storageId] = update.uri;
        _check_authorized(from, ADD);

        _addLandsGames(from, estateId, update.landIds, update.gameIds, false);
        uint256 newId = _incrementTokenVersion(to, estateId);
        emit EstateTokenUpdated(estateId, newId, update);
        return newId;
    }

    /// @notice Used to remove lands from an estate.
    // @review do we need from? only needed when called by approved/superoperators...
    /// @param from The address of the one removing lands.
    /// @param estateId The estate token to remove lands from.
    /// @param rebuild The data to use when reconstructing the Estate.
    /// @dev Note that a valid estate can only contain adjacent lands, so it is possible to attempt to remove lands in a way that would result in an invalid estate, which must be prevented.
    function removeLandsFromEstate(
        address from,
        address to,
        uint256 estateId,
        EstateCRUDData memory rebuild
    ) external returns (uint256) {
        _check_hasOwnerRights(from, estateId);
        _check_authorized(from, ADD);
        _removeLandsGames(to, estateId, rebuild.landIds);
        uint256 newId = _incrementTokenVersion(to, estateId);
        emit EstateTokenUpdated(estateId, newId, rebuild);
        return newId;
    }

    // @notice set games on token`id` from `from` and return game tokens  to `to`.
    /// @param from address from which the game tokens will be added.
    /// @param to address that will recieve game tokens.
    /// @param estateId The estate token that will be updated with the game array.
    /// @param update new configuration for the estate token
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
        (uint256[] memory gamesToRemove, uint256[] memory gamesToAdd) =
            _setGamesOfLands(storageId, update.landIds, update.gameIds, false);

        for (uint256 j = 0; j < gamesToRemove.length; j++) {
            if (gamesToLands[gamesToRemove[j]].length() != 0) {
                gamesToRemove[j] = 0;
            }
        }
        _gameToken.batchTransferFrom(address(this), to, gamesToRemove, "");
        _gameToken.batchTransferFrom(from, address(this), gamesToAdd, "");
        uint256 newId = _incrementTokenVersion(to, estateId);
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
        require(isBurned(estateId), "ASSET_NOT_BURNED");
        require(sender != address(this), "NOT_FROM_THIS");
        address msgSender = _msgSender();
        require(msgSender == sender || _superOperators[msgSender], "NOT_AUTHORIZED");
        _check_withdrawal_authorized(sender, estateId);

        _removeLandsGames(to, estateId, landsToRemove);
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
        if (!isBurned(estateId)) {
            //console.log("do we enter the burned part for estate? ");
            for (uint256 i = 0; i < length; i++) {
                (uint256 landId, uint256 gameId) = estates[storageId].at(i);
                landIds[i] = landId;
                gameIds[i] = gameId;
            }
        }
        return EstateData({landIds: landIds, gameIds: gameIds});
    }

    function getLandsForGame(uint256 gameId) public view returns (uint256[] memory) {
        uint256[] memory landIds = new uint256[](gamesToLands[gameId].length());
        for (uint256 i = 0; i < gamesToLands[gameId].length(); i++) {
            landIds[i] = gamesToLands[gameId].at(i);
        }

        return landIds; //gamesToLands[gameId].values();
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

    // //////////////////////////////////////////////////////////////////////////////////////////////////////

    //this is a function to separate land ids into its x and y coordianates
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

    function _addLandsGames(
        address sender,
        uint256 estateId,
        uint256[] memory landIdsToAdd,
        uint256[] memory gameIds,
        bool justCreated
    ) internal {
        uint256 storageId = _storageId(estateId);
        uint256[] memory newLands;

        if (justCreated) {
            newLands = landIdsToAdd;
        } else {
            EstateData memory ed = getEstateData(estateId);

            //this could be false, there could be the same lands in the
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
        (, uint256[] memory gamesToAdd) = _setGamesOfLands(storageId, landIdsToAdd, gameIds, false);
        //_land.batchTransferFrom(sender, address(this), landIdsToAdd, "");

        (uint256[] memory sizes, uint256[] memory xs, uint256[] memory ys) = _separateId(landIdsToAdd);
        _land.batchTransferQuad(sender, address(this), sizes, xs, ys, "");
        _gameToken.batchTransferFrom(sender, address(this), gamesToAdd, "");
    }

    function _removeLandsGames(
        address to,
        uint256 estateId,
        uint256[] memory landsToRemove
    ) internal {
        uint256 storageId = _storageId(estateId);
        uint256[] memory gameIdsToRemove;
        (gameIdsToRemove, ) = _setGamesOfLands(storageId, landsToRemove, new uint256[](landsToRemove.length), true);

        if (!isBurned(estateId)) {
            for (uint256 j = 0; j < gameIdsToRemove.length; j++) {
                require(gamesToLands[gameIdsToRemove[j]].length() == 0, "GAME_IS_ATTACHED_TO_OTHER_LANDS");
            }
        }

        _land.batchTransferFrom(address(this), to, landsToRemove, "");
        _gameToken.batchTransferFrom(address(this), to, gameIdsToRemove, "");
    }

    function _removeLandsGamesNoAdjacencyCheck(
        address to,
        uint256 estateId,
        uint256[] memory landsToRemove
    ) internal returns (uint256[] memory gameIdsToRemove) {
        uint256 storageId = _storageId(estateId);

        (gameIdsToRemove, ) = _setGamesOfLands(storageId, landsToRemove, new uint256[](landsToRemove.length), true);

        _land.batchTransferFrom(address(this), to, landsToRemove, "");
        _gameToken.batchTransferFrom(address(this), to, gameIdsToRemove, "");
    }

    // in case of multiple lands associated with a single game, these lands should be ordered by their common game token.
    // for example, let's assume we have an estate with these lands and games : [L1,L2,L3]
    // gameIds = [G1,G1,G2] will work,
    // but gameIds = [G1,G2,G1] will not.
    function _setGamesOfLands(
        uint256 storageId,
        uint256[] memory landIds,
        uint256[] memory gameIds,
        bool isRemove
    ) internal returns (uint256[] memory gamesToRemove, uint256[] memory gamesToAdd) {
        // lands without games will be represented as gameId = 0

        require(landIds.length == gameIds.length, "DIFFERENT_LENGTH_LANDS_GAMES");

        //@TODO this previous require will be subistituted, the new check has two possibilities
        // either there are no games
        // or all the lands

        require(landIds.length > 0, "EMPTY_LAND_IDS_ARRAY");
        gamesToRemove = new uint256[](gameIds.length);
        gamesToAdd = new uint256[](gameIds.length);
        uint256 prevOldGame;

        for (uint256 i = 0; i < landIds.length; i++) {
            uint256 gameId = gameIds[i];
            (, uint256 oldGameId) = estates[storageId].tryGet(landIds[i]);
            if (isRemove) {
                require(estates[storageId].remove(landIds[i]), "LAND_DOES_NOT_EXIST");
            } else {
                estates[storageId].set(landIds[i], gameId);
            }

            // skip gameId=0, games duplications, and existing games
            if (oldGameId != 0) {
                gamesToLands[oldGameId].remove(landIds[i]);

                if (oldGameId != prevOldGame && _gameToken.ownerOf(oldGameId) == address(this)) {
                    gamesToRemove[i] = oldGameId;
                }
            }

            // skip gameId=0, games duplications, and existing games
            if (gameId != 0) {
                gamesToLands[gameId].add(landIds[i]);
                if ((i == 0 || gameId != gameIds[i - 1]) && _gameToken.ownerOf(gameId) != address(this)) {
                    gamesToAdd[i] = gameId;
                }
            }

            prevOldGame = oldGameId;
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

    /// @dev Get the a full URI string for a given hash + gameId.
    /// @param hash The 32 byte IPFS hash.
    /// @return The URI string.
    function _toFullURI(bytes32 hash) internal pure override returns (string memory) {
        return string(abi.encodePacked("ipfs://bafybei", hash2base32(hash), "/", "estate.json"));
    }

    /* function isItInArray(uint256 id, uint256[] memory landIds) public pure returns (bool) {
        uint256 size = landIds.length;
        bool flag = false;

        for (uint256 i = 0; i < size; i++) {
            if (landIds[i] == id) {
                flag = true;
                break;
            }
        }

        return flag;
    } */

    // solhint-enable code-complexity
}
