//SPDX-License-Identifier: MIT
// solhint-disable code-complexity
pragma solidity 0.8.2;

import "../common/BaseWithStorage/ImmutableERC721.sol";
import "../common/interfaces/ILandToken.sol";
import "../Game/GameBaseToken.sol";
import "../common/interfaces/IERC721MandatoryTokenReceiver.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../common/BaseWithStorage/WithMinter.sol";
import "@openzeppelin/contracts-0.8/utils/structs/EnumerableSet.sol";
import "../common/Base/TheSandbox712.sol";
import "../common/Libraries/SigUtil.sol";
import "../common/Libraries/MapLib.sol";
import "../common/interfaces/IEstateToken.sol";

import "hardhat/console.sol";

/// @dev An updated Estate Token contract using a simplified verison of LAND with no Quads

contract EstateBaseToken is ImmutableERC721, Initializable, WithMinter, TheSandbox712, IEstateToken {
    using MapLib for MapLib.Map;
    //using EnumerableSet for EnumerableSet.UintSet;
    uint8 internal constant OWNER = 0;
    uint8 internal constant ADD = 1;
    uint8 internal constant BREAK = 2;
    uint8 internal constant WITHDRAWAL = 3;
    uint16 internal constant GRID_SIZE = 408;
    uint64 internal _nextId; // max uint64 = 18,446,744,073,709,551,615
    mapping(uint256 => bytes32) internal _metaData;

    bytes4 internal constant ERC721_RECEIVED = 0x150b7a02;
    bytes4 internal constant ERC721_BATCH_RECEIVED = 0x4b808c46;

    //quadmaps put this somewhere else
    mapping(uint256 => uint256) public quadMap;

    struct Estate {
        MapLib.Map freeLands;
        mapping(uint256 => MapLib.Map) gamesMap; //game id to maps
    }

    //estate id => map
    mapping(uint256 => MapLib.Map) freeLands;

    //estateId => game
    mapping(uint256 => uint256) estateGame;

    //gameId => map
    mapping(uint256 => MapLib.Map) gameLands;

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
    event EstateTokenUpdatedII(uint256 indexed oldId, uint256 indexed newId, IEstateToken.UpdateEstateLands update);

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

    function _addLands(
        address sender,
        uint256 storageId,
        uint256[][3] memory quadTuple
    ) internal {
        require(quadTuple[0].length > 0, "EMPTY_LAND_IDS_ARRAY");
        _land.batchTransferQuad(sender, address(this), quadTuple[0], quadTuple[1], quadTuple[2], "");
        _addLandsMapping(sender, storageId, quadTuple);
    }

    function _removeLands(
        address sender,
        uint256 storageId,
        uint256[][3] memory quadTuple
    ) internal {
        require(quadTuple[0].length > 0, "EMPTY_LAND_IDS_ARRAY");
        _removeLandsMapping(sender, storageId, quadTuple);
        _land.batchTransferQuad(address(this), sender, quadTuple[0], quadTuple[1], quadTuple[2], "");
    }

    function _addLandsMapping(
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

    function _removeLandsMapping(
        //maybe I can unify both with a bool isCreation
        address sender,
        uint256 storageId,
        uint256[][3] memory quads
    ) internal {
        MapLib.Map storage newMap = freeLands[storageId];
        for (uint256 i; i < quads[0].length; i++) {
            newMap.clearQuad(quads[1][i], quads[2][i], quads[0][i], _quadMask);
        }
    }

    //put this somewhere else
    function _quadMask(uint256 size) internal view returns (uint256) {
        return quadMap[size];
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
