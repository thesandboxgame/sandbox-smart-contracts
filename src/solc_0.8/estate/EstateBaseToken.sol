//SPDX-License-Identifier: MIT
// solhint-disable code-complexity
pragma solidity 0.8.2;

import "../common/BaseWithStorage/ImmutableERC721.sol";
import "../common/interfaces/ILandToken.sol";
import "../Game/GameBaseToken.sol";
import "../common/interfaces/IERC721MandatoryTokenReceiver.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
//import "../common/Libraries/UintToUintMap.sol";
import "../common/BaseWithStorage/WithMinter.sol";
import "@openzeppelin/contracts-0.8/utils/structs/EnumerableSet.sol";
import "../common/Base/TheSandbox712.sol";
import "../common/Libraries/SigUtil.sol";
import "../common/Libraries/MapLib.sol";
import "../common/interfaces/IEstateToken.sol";

import "hardhat/console.sol";

/// @dev An updated Estate Token contract using a simplified verison of LAND with no Quads

contract EstateBaseToken is ImmutableERC721, Initializable, WithMinter, TheSandbox712, IEstateToken {
    //using EnumerableMap for EnumerableMap.UintToUintMap;
    using MapLib for MapLib.Map;
    using EnumerableSet for EnumerableSet.UintSet;
    uint8 internal constant OWNER = 0;
    uint8 internal constant ADD = 1;
    uint8 internal constant BREAK = 2;
    uint8 internal constant WITHDRAWAL = 3;
    uint16 internal constant GRID_SIZE = 408;
    uint64 internal _nextId; // max uint64 = 18,446,744,073,709,551,615
    mapping(uint256 => bytes32) internal _metaData;

    bytes4 internal constant ERC721_RECEIVED = 0x150b7a02;
    bytes4 internal constant ERC721_BATCH_RECEIVED = 0x4b808c46;

    // estates key = storageId
    // EnumerableMap.UintToUintMap keys = land ids
    // EnumerableMap.UintToUintMap values = game ids
    //map to a map
    //mapping(uint256 => EnumerableMap.UintToUintMap) internal estates;

    //quadmaps put this somewhere else
    mapping(uint256 => uint256) public quadMap;

    struct Estate {
        MapLib.Map freeLands;
        mapping(uint256 => MapLib.Map) gamesMap; //game id to maps
    }

    mapping(uint256 => MapLib.Map) freeLands;

    // gamesToLands key = gameId, value = landIds
    //mapping(uint256 => EnumerableSet.UintSet) internal gamesToLands;

    LandToken internal _land;
    GameBaseToken internal _gameToken;

    /// @dev Emits when a estate is updated.
    /// @param oldId The id of the previous erc721 ESTATE token.
    /// @param newId The id of the newly minted token.
    /// @param update The changes made to the Estate.
    event EstateTokenUpdated(uint256 indexed oldId, uint256 indexed newId, IEstateToken.EstateCRUDData update);

    /// @dev Emits when a estate is updated.
    /// @param oldId The id of the previous erc721 ESTATE token.
    /// @param newId The id of the newly minted token.
    /// @param update The changes made to the Estate.
    event EstateTokenUpdatedII(uint256 indexed oldId, uint256 indexed newId, IEstateToken.UpdateEstateData update);

    event EstateTokenUpdatedV3(uint256 indexed oldId, uint256 indexed newId, IEstateToken.EstateData update);

    function initV1(
        address trustedForwarder,
        address admin,
        //address minter,
        LandToken land,
        GameBaseToken gameToken,
        uint8 chainIndex
    ) public initializer {
        _admin = admin;
        //_minter = minter;
        _gameToken = gameToken;
        _land = land;
        ImmutableERC721.__ImmutableERC721_initialize(chainIndex);

        //start quad map
        quadMap[1] = 1;
        quadMap[3] = 2**3 - 1;
        quadMap[6] = 2**6 - 1;
        quadMap[12] = 2**12 - 1;
        quadMap[24] = 2**24 - 1;
        //ERC721BaseToken.__ERC721BaseToken_initialize(chainIndex);
    }

    // @todo Add access-control: minter-only? could inherit WithMinter.sol, the game token creator is minter only
    /// @notice Create a new estate token with lands.
    /* /// @param from The address of the one creating the estate.
    /// @param to The address that will own the estate. */
    /// @param creation The data to use to create the estate.
    function createEstate(
        address from,
        IEstateToken.EstateCRUDData calldata creation,
        bytes calldata signature /* , uint256 timeStamp */
    ) external override onlyMinter() returns (uint256) {
        (uint256 estateId, uint256 storageId) = _mintEstate(from, _nextId++, 1, true);
        _metaData[storageId] = creation.uri;
        _addLandsGames(
            from,
            storageId,
            creation.quadTuple /* , creation.gameIds */
        );
        emit EstateTokenUpdated(0, estateId, creation);
        return estateId;
    }

    function _addLandsGames(
        address sender,
        uint256 storageId,
        uint256[][3] memory quadTuple
    ) internal {
        require(quadTuple[0].length > 0, "EMPTY_LAND_IDS_ARRAY");
        _land.batchTransferQuad(sender, address(this), quadTuple[0], quadTuple[1], quadTuple[2], "");

        _landsMapping(sender, storageId, quadTuple);
    }

    function _landsMapping(
        //maybe I can unify both with a bool isCreation
        address sender,
        uint256 storageId,
        uint256[][3] memory quads
    ) internal {
        MapLib.Map storage newMap = freeLands[storageId];
        for (uint256 i; i < quads[0].length; i++) {
            newMap.setQuad(quads[1][i], quads[2][i], quads[0][i], _quadMask);
        }
    }

    //put this somewhere else
    function _quadMask(uint256 size) internal view returns (uint256) {
        return quadMap[size];
    }

    /* function updateEstate(
        address from,
        uint256 estateId,
        IEstateToken.UpdateEstateData memory update,
        bytes calldata signature
    ) external override returns (uint256) {
        _check_hasOwnerRights(from, estateId);
        uint256 storageId = _storageId(estateId);

        _metaData[storageId] = update.uri;

        uint256 gameToAddLength = update.landAndGameAssociationsToAdd[1].length;
        uint256 gameToRemoveLength = update.landAndGameAssociationsToRemove[1].length;

        //add lands
        _addLands(storageId, from, update.landIdsToAdd);

        // remove association
        if (gameToRemoveLength > 0) {
            require(
                gameToRemoveLength == update.landAndGameAssociationsToRemove[0].length,
                "DIFFERENT_LENGTH_LANDS_GAMES"
            );

            _removeGamesOfLands(from, storageId, update.landAndGameAssociationsToRemove[1], update.gameIdsToRemove);
        }

        // add association
        if (gameToAddLength > 0) {
            require(gameToAddLength == update.landAndGameAssociationsToAdd[0].length, "DIFFERENT_LENGTH_LANDS_GAMES");
            _addLandsGamesAssociationUpdate(from, storageId, update.landAndGameAssociationsToAdd, update.gameIdsToAdd);
        }

        // remove lands
        _removeLands(storageId, from, update.landIdsToRemove, false);

        uint256 newId = _incrementTokenVersion(from, estateId);
        IEstateToken.EstateData memory estateState = getEstateData(storageId);
        emit EstateTokenUpdatedII(estateId, newId, update);
    } */

    /* function _addLandsGamesAssociation(
        //maybe I can unify both with a bool isCreation
        address sender,
        uint256 storageId,
        uint256[] memory landIds,
        uint256[] memory gameIds
    ) internal {
        uint256[] memory uiniqueGameIds = new uint256[](gameIds.length);
        uint256 numUniqueGames = 0;
        bool onlyZeroes = true;

        for (uint256 i = 0; i < landIds.length; i++) {
            uint256 gameId = gameIds[i];

            (bool occupied, uint256 key) = estates[storageId].tryGet(landIds[i]);

            require((key == 0), "LAND_ALREADY_OCCUPIED");

            if (occupied) {
                estates[storageId].remove(landIds[i]);
                gamesToLands[gameId].remove(landIds[i]);
            }

            estates[storageId].set(landIds[i], gameId);
            gamesToLands[gameId].add(landIds[i]);

            if (gameIds.length > 1) {
                if (gameId != 0) {
                    if (
                        (i == 0 || gameId != gameIds[i - 1]) &&
                        _gameToken.ownerOf(gameId) != address(this) &&
                        gameId != 0
                    ) {
                        onlyZeroes = false;
                        uiniqueGameIds[numUniqueGames] = gameId;
                        numUniqueGames++;
                    } else {
                        if (_gameToken.ownerOf(gameId) != address(this) && gameId != 0) {
                            onlyZeroes = false;
                            uiniqueGameIds[numUniqueGames] = gameId;
                            numUniqueGames++;
                        }
                    }
                }
            } else {
                if (gameId != 0) {
                    onlyZeroes = false;
                    uiniqueGameIds[numUniqueGames] = gameId;
                    numUniqueGames++;
                }
            }
        }

        if (numUniqueGames != gameIds.length) {
            uint256[] memory uiniqueGameArray = new uint256[](numUniqueGames);

            for (uint256 i = 0; i < numUniqueGames; i++) {
                uiniqueGameArray[i] = uiniqueGameIds[i];
            }

            if (!onlyZeroes) {
                _gameToken.batchTransferFrom(sender, address(this), uiniqueGameArray, "");
            }
        } else {
            _gameToken.batchTransferFrom(sender, address(this), gameIds, "");
        }
    } */

    /* function _addLandsGamesAssociationUpdate(
        address sender,
        uint256 storageId,
        uint256[][] memory landAndGameAssociationsToAdd,
        uint256[] memory gameIds
    ) internal {
        for (uint256 i = 0; i < landAndGameAssociationsToAdd[0].length; i++) {
            uint256 gameId = landAndGameAssociationsToAdd[1][i];

            (bool occupied, uint256 key) = estates[storageId].tryGet(landAndGameAssociationsToAdd[0][i]);

            require((key == 0), "LAND_ALREADY_OCCUPIED");

            if (occupied) {
                //REMOVE 0
                estates[storageId].remove(landAndGameAssociationsToAdd[0][i]);
                gamesToLands[gameId].remove(landAndGameAssociationsToAdd[0][i]);
            }

            estates[storageId].set(landAndGameAssociationsToAdd[0][i], gameId);

            gamesToLands[gameId].add(landAndGameAssociationsToAdd[0][i]);
        }

        if (gameIds.length > 0) {
            _gameToken.batchTransferFrom(sender, address(this), gameIds, "");
        }
    } */

    /* function _removeGamesOfLands(
        address from,
        uint256 storageId,
        uint256[] memory gameAssociationsToRemove,
        uint256[] memory gameIdsToRemove
    ) internal {
        uint256[] memory landsFromGames;

        for (uint256 i = 0; i < gameAssociationsToRemove.length; i++) {
            landsFromGames = getLandsForGame(gameAssociationsToRemove[i]);

            uint256 length = gamesToLands[gameAssociationsToRemove[i]].length();

            for (uint256 j = 0; j < length; j++) {
                uint256 toRemove = gamesToLands[gameAssociationsToRemove[i]].at(0); //it was j before
                gamesToLands[gameAssociationsToRemove[i]].remove(toRemove);
            }

            for (uint256 j = 0; j < landsFromGames.length; j++) {
                estates[storageId].set(landsFromGames[j], 0);
            }
        }
        _gameToken.batchTransferFrom(address(this), from, gameIdsToRemove, "");
    } */

    /* function _addLands(
        uint256 storageId,
        address from,
        uint256[] memory landIdsToAdd
    ) internal {
        uint256 len = landIdsToAdd.length;

        for (uint256 i = 0; i < len; i++) {
            estates[storageId].set(landIdsToAdd[i], 0);
        }

        _land.batchTransferFrom(from, address(this), landIdsToAdd, "");
    }
 */
    /* function _removeLands(
        uint256 storageId,
        address from,
        uint256[] memory landIdsToRemove,
        bool isBurned
    ) internal {
        uint256 len = landIdsToRemove.length;
        for (uint256 i = 0; i < len; i++) {
            (bool occupied, uint256 key) = estates[storageId].tryGet(landIdsToRemove[i]);

            require(
                // !occupied
                isBurned || key == 0,
                "GAME_STILL_HOLDS_A_LAND"
            );

            require(estates[storageId].remove(landIdsToRemove[i]), "LAND_DOES_NOT_EXIST");
        }
        _land.batchTransferFrom(address(this), from, landIdsToRemove, "");
    } */

    /* function getGames(uint256 estateId) public view returns (uint256[] memory) {
        uint256 storageId = _storageId(estateId);
        uint256 length = estates[storageId].length();

        uint256[] memory gameIds = new uint256[](length);
        uint256[] memory uniqueGames = new uint256[](length);
        uint256 uniqueNumber = 0;

        if (length == 1) {
            (uint256 landId, uint256 gameId) = estates[storageId].at(0);
            gameIds[0] = gameId;
            return gameIds;
        } else {
            for (uint256 i = 0; i < length; i++) {
                (uint256 landId, uint256 gameId) = estates[storageId].at(i);
                gameIds[i] = gameId;
                if (i == 0) {
                    uniqueGames[uniqueNumber] = gameId;
                    uniqueNumber++;
                } else {
                    if (gameId != gameIds[i - 1]) {
                        uniqueGames[uniqueNumber] = gameId;
                        uniqueNumber++;
                    }
                }
            }
            if (uniqueNumber != length) {
                uint256[] memory filteredArray = new uint256[](uniqueNumber);
                for (uint256 i = 0; i < uniqueNumber; i++) {
                    filteredArray[i] = uniqueGames[i];
                }
                return filteredArray;
            } else {
                return gameIds;
            }
        }
    } */

    /* function getLandsForGame(uint256 gameId) public view returns (uint256[] memory) {
        uint256[] memory landIds = new uint256[](gamesToLands[gameId].length());

        for (uint256 i = 0; i < gamesToLands[gameId].length(); i++) {
            landIds[i] = gamesToLands[gameId].at(i);
        }

        return landIds; //gamesToLands[gameId].values();
    } */

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
        return ERC721_RECEIVED;
    }

    function onERC721BatchReceived(
        address, /*operator*/
        address, /*from*/
        uint256[] calldata, /*ids*/
        bytes calldata /*data*/
    ) external pure returns (bytes4) {
        return ERC721_BATCH_RECEIVED;
    }

    // //////////////////////////////////////////////////////////////////////////////////////////////////////

    //this is a function to separate land ids into its x and y coordianates
    /* function _separateId(
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
            xs[i] = _land.getX(landIds[i]);
            ys[i] = _land.getY(landIds[i]);
        }
        return (sizes, xs, ys);
    } */

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

        (uint256 newId, ) = _mintEstate(owner, subId, version, false);

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

    function isItInArray(uint256 id, uint256[] memory landIds) public pure returns (bool) {
        uint256 size = landIds.length;
        bool flag = false;

        for (uint256 i = 0; i < size; i++) {
            if (landIds[i] == id) {
                flag = true;
                break;
            }
        }

        return flag;
    }

    //address private backAddress;

    /* function setBackAddress(address wallet) public {
        backAddress = wallet;
    }

    function getBackAddress() public view returns (address) {
        return backAddress;
    } */

    // solhint-enable code-complexity
}
