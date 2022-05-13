// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {AccessControl} from "@openzeppelin/contracts-0.8/access/AccessControl.sol";
import {IAccessControl} from "@openzeppelin/contracts-0.8/access/IAccessControl.sol";
import {Context} from "@openzeppelin/contracts-0.8/utils/Context.sol";
import "../common/BaseWithStorage/ImmutableERC721.sol";
import "../common/interfaces/ILandToken.sol";
import "../common/interfaces/IERC721MandatoryTokenReceiver.sol";
import "../common/Libraries/MapLib.sol";

/// @dev An updated Estate Token contract using a simplified verison of LAND with no Quads
abstract contract EstateBaseToken is ImmutableERC721, AccessControl {
    using MapLib for MapLib.Map;
    event EstateTokenMinted(uint256 indexed estateId, bytes32 _metaData, TileWithCoordLib.TileWithCoord[] data);
    event EstateBurned(uint256 indexed estateId);

    // TODO: Taken from Land Token, we must add  (x,y,size) = land.idToQuadSomething()
    uint256 public constant GRID_SIZE = 408;
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    uint64 public nextId; // max uint64 = 18,446,744,073,709,551,615

    ILandToken public land;

    mapping(uint256 => bytes32) public metaData;

    // estate id => free lands
    mapping(uint256 => MapLib.Map) internal freeLands;

    function _unchained_initV1(
        address trustedForwarder,
        address admin,
        ILandToken _land,
        uint8 chainIndex
    ) internal {
        ImmutableERC721.__ImmutableERC721_initialize(chainIndex);
        ERC2771Handler.__ERC2771Handler_initialize(trustedForwarder);
        _setupRole(DEFAULT_ADMIN_ROLE, admin);
        _admin = admin;
        land = _land;
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

    //
    //    // TODO: Is is ok to throw here ? Do we get only 10000 gas ? What about reentrancy attacks to Land or us ?
    //    function onERC721Received(
    //        address, /* operator */
    //        address, /* from */
    //        uint256 id,
    //        bytes calldata data
    //    ) external virtual returns (bytes4) {
    //        if (msg.sender == address(land)) {
    //            uint256 estateId = abi.decode(data, (uint256));
    //            uint256 storageId = _storageId(estateId);
    //            freeLands[storageId].setQuad(id % GRID_SIZE, id / GRID_SIZE, _quadSize(id));
    //        }
    //        return this.onERC721Received.selector;
    //    }
    //
    //    // TODO: Is is ok to throw here ? Do we get only 10000 gas ? What about reentrancy attacks to Land or us?
    //    function onERC721BatchReceived(
    //        address, /* operator */
    //        address, /* from */
    //        uint256[] calldata ids,
    //        bytes calldata data
    //    ) external virtual returns (bytes4) {
    //        if (msg.sender == address(land)) {
    //            // TODO: Maybe we can support just one estate id
    //            uint256[] memory estateIds = abi.decode(data, (uint256[]));
    //            for (uint256 i; i < ids.length; i++) {
    //                uint256 storageId = _storageId(estateIds[i]);
    //                freeLands[storageId].setQuad(ids[i] % GRID_SIZE, ids[i] / GRID_SIZE, _quadSize(ids[i]));
    //            }
    //        }
    //        return this.onERC721BatchReceived.selector;
    //    }

    function supportsInterface(bytes4 interfaceId) public pure override(AccessControl, ERC721BaseToken) returns (bool) {
        return
            ERC721BaseToken.supportsInterface(interfaceId) ||
            // AccessControl.supportsInterface(interfaceId);
            interfaceId == type(IAccessControl).interfaceId;
    }

    function _createEstate(
        address from,
        MapLib.QuadsAndTiles calldata freeLand,
        bytes32 uri
    ) internal returns (uint256 estateId, uint256 storageId) {
        require(hasRole(MINTER_ROLE, _msgSender()), "not minter");
        // batchTransferQuad does that for us
        // require(quadTuple[0].length == quadTuple[1].length && quadTuple[0].length == quadTuple[2].length, "Invalid data");
        if (freeLand.quads[0].length > 0) {
            land.batchTransferQuad(from, address(this), freeLand.quads[0], freeLand.quads[1], freeLand.quads[2], "");
        }
        (estateId, storageId) = _mintToken(from);
        metaData[storageId] = uri;
        freeLands[storageId].add(freeLand);
        return (estateId, storageId);
    }

    function _mintEstate(
        address from,
        bytes32 _metaData,
        TileWithCoordLib.TileWithCoord[] calldata freeLand
    ) internal returns (uint256) {
        require(hasRole(MINTER_ROLE, _msgSender()), "not minter");
        (uint256 estateId, uint256 storageId) = _mintToken(from);
        metaData[storageId] = _metaData;
        freeLands[storageId].add(freeLand);
        emit EstateTokenMinted(estateId, _metaData, freeLand);
        return estateId;
    }

    function _mintToken(address from) internal returns (uint256 estateId, uint256 storageId) {
        uint16 version = 1;
        uint256 estateId = _generateTokenId(from, nextId++, _chainIndex, version);
        uint256 storageId = _storageId(estateId);
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
        MapLib.QuadsAndTiles calldata landToAdd,
        uint256[][3] calldata landToRemove,
        bytes32 uri
    ) internal returns (uint256 newEstateId, uint256 newStorageId) {
        require(hasRole(MINTER_ROLE, _msgSender()), "not minter");
        require(_ownerOf(estateId) == from, "Invalid Owner");
        // batchTransferQuad does that for us
        // require(quadsToAdd[0].length == quadsToAdd[1].length && quadsToAdd[0].length == quadsToAdd[2].length, "Invalid data");
        // require(quadsToRemove[0].length == quadsToRemove[1].length && quadsToRemove[0].length == quadsToRemove[2].length, "Invalid data");

        uint256 storageId = _storageId(estateId);
        metaData[storageId] = uri;

        freeLands[storageId].add(landToAdd);
        if (landToAdd.quads[0].length > 0) {
            land.batchTransferQuad(from, address(this), landToAdd.quads[0], landToAdd.quads[1], landToAdd.quads[2], "");
        }

        if (landToRemove[0].length > 0) {
            freeLands[storageId].remove(landToRemove);
            land.batchTransferQuad(address(this), from, landToRemove[0], landToRemove[1], landToRemove[2], "");
        }
        return _incrementTokenVersion(from, estateId);
    }

    function _burnEstate(
        address from,
        uint256 estateId,
        uint256 storageId
    ) internal {
        require(hasRole(BURNER_ROLE, _msgSender()), "not burner");
        delete metaData[storageId];
        freeLands[storageId].clear();
        _burn(from, from, storageId);
        emit EstateBurned(estateId);
    }

    function _freeLand(uint256 estateId) internal view returns (TileWithCoordLib.TileWithCoord[] memory) {
        uint256 storageId = _storageId(estateId);
        return freeLands[storageId].getMap();
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
        // address originalCreator = address(uint160(estateId / CREATOR_OFFSET_MULTIPLIER));

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

    // TODO: This really belong to the land contract!!!
    function _quadSize(uint256 id) private pure returns (uint256) {
        uint256 size = id >> 254;
        if (size == 0) return 1;
        if (size == 1) return 3;
        if (size == 2) return 6;
        if (size == 3) return 12;
        if (size == 4) return 24;
        return 0;
    }
}
