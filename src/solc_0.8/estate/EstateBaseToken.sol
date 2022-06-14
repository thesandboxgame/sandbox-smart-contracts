// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {AccessControl} from "@openzeppelin/contracts-0.8/access/AccessControl.sol";
import {IAccessControl} from "@openzeppelin/contracts-0.8/access/IAccessControl.sol";
import {Context} from "@openzeppelin/contracts-0.8/utils/Context.sol";
import {ImmutableERC721} from "../common/BaseWithStorage/ImmutableERC721.sol";
import {ILandToken} from "../common/interfaces/ILandToken.sol";
import {IERC721MandatoryTokenReceiver} from "../common/interfaces/IERC721MandatoryTokenReceiver.sol";
import {ERC721BaseToken} from "../common/BaseWithStorage/ERC721BaseToken.sol";
import {ERC2771Handler} from "../common/BaseWithStorage/ERC2771Handler.sol";
import {TileWithCoordLib} from "../common/Libraries/TileWithCoordLib.sol";
import {MapLib} from "../common/Libraries/MapLib.sol";
import {EstateBaseTokenStorage} from "./EstateBaseTokenStorage.sol";

/// @dev Base contract for estate contract on L1 and L2, it uses tile maps to save the landTileSet
abstract contract EstateBaseToken is EstateBaseTokenStorage, ImmutableERC721, AccessControl {
    using MapLib for MapLib.Map;
    /// @dev Emitted when an estate is updated.
    /// @param estateId The id of the newly minted token.
    /// @param lands initial quads of lands to add
    /// @param metadata initial metadata to set
    event EstateTokenCreated(uint256 indexed estateId, uint256[][3] lands, bytes32 metadata);

    /// @dev Emitted when lands are added to the estate.
    /// @param estateId The id of the previous erc721 ESTATE token.
    /// @param newId The id of the newly minted token.
    /// @param lands The quads of lands added to the estate.
    event EstateTokenLandsAdded(uint256 indexed estateId, uint256 indexed newId, uint256[][3] lands);

    event EstateTokenMinted(uint256 indexed estateId, bytes32 metaData, TileWithCoordLib.TileWithCoord[] data);
    event EstateBurned(uint256 indexed estateId);
    event MetadataSet(uint256 indexed estateId, bytes32 metaData);

    function _unchained_initV1(
        address trustedForwarder,
        address admin,
        address _landToken,
        uint8 chainIndex
    ) internal {
        ImmutableERC721.__ImmutableERC721_initialize(chainIndex);
        ERC2771Handler.__ERC2771Handler_initialize(trustedForwarder);
        _setupRole(DEFAULT_ADMIN_ROLE, admin);
        _admin = admin;
        _s().landToken = _landToken;
    }

    function setMetadata(uint256 estateId, bytes32 metadata) external {
        require(_ownerOf(estateId) == _msgSender(), "not owner");
        uint256 storageId = _storageId(estateId);
        _s().metaData[storageId] = metadata;
        emit MetadataSet(estateId, metadata);
    }

    /// @notice Create a new estate token with lands.
    /// @param lands The set of quads to add.
    /// @param metadata The metadata hash to use
    function create(uint256[][3] calldata lands, bytes32 metadata) external returns (uint256) {
        (uint256 estateId, uint256 storageId) = _createEstate(_msgSender(), lands, metadata);
        require(_landTileSet(storageId).isAdjacent(), "not adjacent");
        emit EstateTokenCreated(estateId, lands, metadata);
        return estateId;
    }

    function addLand(uint256 estateId, uint256[][3] calldata landToAdd) external returns (uint256) {
        // we can optimize when adding only one quad
        uint256 storageId = _storageId(estateId);
        uint256 newId;
        // The risk with this optimizations is that you keep adding lands but then you cannot remove because
        // the removal check is the expensive one.
        if (landToAdd[0].length == 1) {
            // check that the quad is adjacent before adding
            require(
                _landTileSet(storageId).isAdjacent(landToAdd[1][0], landToAdd[2][0], landToAdd[0][0]),
                "not adjacent"
            );
            (newId, ) = _updateLandsEstate(_msgSender(), estateId, storageId, landToAdd);
        } else {
            // add everything then make the heavier check of the result
            (newId, ) = _updateLandsEstate(_msgSender(), estateId, storageId, landToAdd);
            require(_landTileSet(storageId).isAdjacent(), "not adjacent");
        }
        emit EstateTokenLandsAdded(estateId, newId, landToAdd);
        return newId;
    }

    function getMetadata(uint256 estateId) external view returns (bytes32) {
        return _s().metaData[_storageId(estateId)];
    }

    function getNextId() external view returns (uint64) {
        return _s().nextId;
    }

    function getLandToken() external view returns (address) {
        return _s().landToken;
    }

    function getLandLength(uint256 estateId) external view returns (uint256) {
        uint256 storageId = _storageId(estateId);
        return _landTileSet(storageId).length();
    }

    function getLandAt(
        uint256 estateId,
        uint256 offset,
        uint256 limit
    ) external view returns (TileWithCoordLib.TileWithCoord[] memory) {
        uint256 storageId = _storageId(estateId);
        return _landTileSet(storageId).at(offset, limit);
    }

    function containsShiftResult(uint256 estateId, TileWithCoordLib.ShiftResult memory shiftResult)
        external
        view
        returns (bool)
    {
        uint256 storageId = _storageId(estateId);
        return _landTileSet(storageId).containsShiftResult(shiftResult);
    }

    function getLandCount(uint256 estateId) external view returns (uint256) {
        uint256 storageId = _storageId(estateId);
        return _landTileSet(storageId).getLandCount();
    }

    /// @notice Return the name of the token contract.
    /// @return The name of the token contract.
    function name() external pure override returns (string memory) {
        return "The Sandbox: ESTATE token";
    }

    /// @notice Get the symbol of the token contract.
    /// @return the symbol of the token contract.
    function symbol() external pure override returns (string memory) {
        return "ESTATE";
    }

    function onERC721Received(
        address, /* operator */
        address, /* from */
        uint256, /* id */
        bytes calldata /* data */
    ) external virtual returns (bytes4) {
        return this.onERC721Received.selector;
    }

    function onERC721BatchReceived(
        address, /* operator */
        address, /* from */
        uint256[] calldata, /* ids */
        bytes calldata /* data */
    ) external virtual returns (bytes4) {
        return this.onERC721BatchReceived.selector;
    }

    function supportsInterface(bytes4 interfaceId) public pure override(AccessControl, ERC721BaseToken) returns (bool) {
        return
            ERC721BaseToken.supportsInterface(interfaceId) ||
            // AccessControl.supportsInterface(interfaceId);
            interfaceId == type(IAccessControl).interfaceId;
    }

    function _createEstate(
        address from, // msg sender
        uint256[][3] calldata landToAdd,
        bytes32 _metaData
    ) internal returns (uint256 estateId, uint256 storageId) {
        // batchTransferQuad does that for us
        // require(quadTuple[0].length == quadTuple[1].length && quadTuple[0].length == quadTuple[2].length, "Invalid data");
        if (landToAdd[0].length > 0) {
            ILandToken(_s().landToken).batchTransferQuad(
                from,
                address(this),
                landToAdd[0],
                landToAdd[1],
                landToAdd[2],
                ""
            );
        }
        (estateId, storageId) = _mintToken(from);
        _s().metaData[storageId] = _metaData;
        _landTileSet(storageId).add(landToAdd);
        return (estateId, storageId);
    }

    // Used from the estate tunnel
    function _mintEstate(
        address from,
        bytes32 _metaData,
        TileWithCoordLib.TileWithCoord[] calldata lands
    ) internal returns (uint256) {
        require(hasRole(MINTER_ROLE, _msgSender()), "not minter");
        (uint256 estateId, uint256 storageId) = _mintToken(from);
        _s().metaData[storageId] = _metaData;
        _landTileSet(storageId).add(lands);
        emit EstateTokenMinted(estateId, _metaData, lands);
        return estateId;
    }

    function _mintToken(address from) internal returns (uint256 estateId, uint256 storageId) {
        uint16 version = 1;
        estateId = _generateTokenId(from, _s().nextId++, _chainIndex, version);
        storageId = _storageId(estateId);
        require(_owners[storageId] == 0, "STORAGE_ID_REUSE_FORBIDDEN");

        // TODO: Move to base class somehow
        _owners[storageId] = (uint256(version) << 200) + uint256(uint160(from));
        _numNFTPerAddress[from]++;
        emit Transfer(address(0), from, estateId);
        return (estateId, storageId);
    }

    function _updateLandsEstate(
        address from,
        uint256 estateId,
        uint256 storageId,
        uint256[][3] calldata landToAdd
    ) internal returns (uint256 newEstateId, uint256 newStorageId) {
        require(_ownerOf(estateId) == from, "Invalid Owner");
        // batchTransferQuad does that for us
        // require(quadsToAdd[0].length == quadsToAdd[1].length && quadsToAdd[0].length == quadsToAdd[2].length, "Invalid data");
        // require(quadsToRemove[0].length == quadsToRemove[1].length && quadsToRemove[0].length == quadsToRemove[2].length, "Invalid data");
        _landTileSet(storageId).add(landToAdd);
        if (landToAdd[0].length > 0) {
            ILandToken(_s().landToken).batchTransferQuad(
                from,
                address(this),
                landToAdd[0],
                landToAdd[1],
                landToAdd[2],
                ""
            );
        }
        return _incrementTokenVersion(from, estateId);
    }

    function _burnEstate(
        address from,
        uint256 estateId,
        uint256 storageId
    ) internal returns (bytes32 _metaData, TileWithCoordLib.TileWithCoord[] memory _tiles) {
        require(hasRole(BURNER_ROLE, _msgSender()), "not burner");
        _metaData = _s().metaData[storageId];
        delete _s().metaData[storageId];
        _tiles = _landTileSet(storageId).getMap();
        _landTileSet(storageId).clear();
        _burn(from, from, storageId);
        emit EstateBurned(estateId);
        return (_metaData, _tiles);
    }

    function _msgSender() internal view override(Context, ERC2771Handler) returns (address sender) {
        return ERC2771Handler._msgSender();
    }

    function _msgData() internal view override(Context, ERC2771Handler) returns (bytes calldata) {
        return ERC2771Handler._msgData();
    }

    // TODO: Move to base class ?
    /// @dev used to increment the version in a tokenId by burning the original and reminting a new token. Mappings to token-specific data are preserved via the storageId mechanism.
    /// @param from The address of the token owner.
    /// @param estateId The tokenId to increment.
    /// @return newEstateId the version-incremented tokenId.
    /// @return newStorageId the version-incremented storageId.
    function _incrementTokenVersion(address from, uint256 estateId)
        internal
        returns (uint256 newEstateId, uint256 newStorageId)
    {
        uint64 subId = uint64(estateId / SUBID_MULTIPLIER);
        uint16 version = uint16(estateId);
        version++;
        address owner = _ownerOf(estateId);

        if (from == owner) {
            _burn(from, owner, estateId);
        }
        newEstateId = _generateTokenId(from, subId, _chainIndex, version);
        newStorageId = _storageId(estateId);
        // TODO: Move to base class somehow
        _owners[newStorageId] = (uint256(version) << 200) + uint256(uint160(from));
        _numNFTPerAddress[from]++;
        emit Transfer(address(0), from, newEstateId);
        // TODO: this checks something that is already true ?
        address newOwner = _ownerOf(newEstateId);
        require(owner == newOwner, "NOT_OWNER");
    }
}
