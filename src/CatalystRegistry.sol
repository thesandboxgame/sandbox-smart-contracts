pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import "./Interfaces/AssetToken.sol";
import "./Catalyst/CatalystToken.sol";
import "./contracts_common/src/BaseWithStorage/Admin.sol";


contract CatalystRegistry is Admin {
    event Minter(address newMinter);
    event CatalystApplied(uint256 assetId, address catalyst);
    event GemsSocketed(uint256 assetId, address catalyst, uint256[] gemIds);

    struct Gem {
        uint64 blockNumber;
        uint32 id;
    }

    struct Attribute {
        uint32 gemId;
        uint32 value;
    }

    struct CatalystStored {
        CatalystToken token;
        Gem[] gems;
    }

    struct Catalyst {
        CatalystToken token;
        Gem[] gems;
        uint256 baseTokenId;
    }

    function setCatalyst(
        uint256 assetId,
        CatalystToken catalystToken,
        uint256[] calldata gemIds
    ) external {
        require(msg.sender == _minter, "NOT_MINTER");

        _catalysts[assetId].token = catalystToken;
        delete _catalysts[assetId].gems;
        emit CatalystApplied(assetId, address(catalystToken));
        if (gemIds.length > 0) {
            _addGems(_catalysts[assetId], gemIds);
            emit GemsSocketed(assetId, address(catalystToken), gemIds);
        }
    }

    function addGems(uint256 assetId, uint256[] calldata gemIds) external {
        require(gemIds.length > 0, "NO_GEMS_GIVEN");
        require(msg.sender == _minter, "NOT_MINTER");
        CatalystStored storage catalyst = _catalysts[assetId];
        address catalystToken = address(catalyst.token);
        if (catalystToken == address(0)) {
            // copy if not set
            (CatalystStored storage parentCatalyst, ) = _getCatalyst(assetId);
            catalyst.token = parentCatalyst.token;
            catalyst.gems = parentCatalyst.gems;
        }
        _addGems(catalyst, gemIds);
        emit GemsSocketed(assetId, catalystToken, gemIds);
    }

    /// @notice return the Catalyst associated with an Asset
    /// @param assetId token id of the Asset
    /// @return catalyst with gem Ids and blockNumber
    function getCatalyst(uint256 assetId) external view returns (Catalyst memory catalyst) {
        (CatalystStored storage catalystStored, uint256 baseTokenId) = _getCatalyst(assetId);
        return Catalyst({token: catalystStored.token, gems: catalystStored.gems, baseTokenId: baseTokenId});
    }

    /// @notice return the attributes for a particular asset.
    /// @param assetId tokenId of the Asset.
    /// @param gemBlockHashes list of block hashes, one for each gem. These must coorespon to the block hashes of the block Number returned by `getGemBlockNumbers`.
    /// @return attributes the attributes associatted with that token.
    function getAttributes(uint256 assetId, bytes32[] calldata gemBlockHashes) external view returns (Attribute[] memory attributes) {
        (CatalystStored storage catalyst, uint256 baseTokenId) = _getCatalyst(assetId);
        Gem[] memory gems = catalyst.gems;
        require(gems.length == gemBlockHashes.length, "invalid number of blockHash");
        attributes = new Attribute[](gems.length);
        for (uint256 i = 0; i < gems.length; i++) {
            uint32 gemId = gems[i].id;
            attributes[i] = Attribute({gemId: gemId, value: catalyst.token.getValue(baseTokenId, gemId, i, gemBlockHashes[i])});
        }
    }

    /// @notice return the list of blockNumbers for each socket.
    /// @param assetId tokenId of the Asset.
    /// @return blockNumbers list of blockNumber for each gems.
    function getGemBlockNumbers(uint256 assetId) external view returns (uint64[] memory blockNumbers) {
        (CatalystStored storage catalyst, ) = _getCatalyst(assetId);
        blockNumbers = new uint64[](catalyst.gems.length);
        for (uint256 i = 0; i < blockNumbers.length; i++) {
            blockNumbers[i] = catalyst.gems[i].blockNumber;
        }
    }

    /// @notice Set the Minter that will be the only address able to create Estate
    /// @param minter address of the minter
    function setMinter(address minter) external {
        require(msg.sender == _admin, "ADMIN_NOT_AUTHORIZED");
        require(minter != _minter, "MINTER_SAME_ALREADY_SET");
        _minter = minter;
        emit Minter(minter);
    }

    /// @notice return the current minter
    function getMinter() external view returns (address) {
        return _minter;
    }

    // ///////// INTERNAL ////////////

    function _getCatalyst(uint256 assetId) internal view returns (CatalystStored storage catalyst, uint256 baseTokenId) {
        catalyst = _catalysts[assetId];
        baseTokenId = assetId;
        if (address(catalyst.token) == address(0)) {
            uint256 collectionId = _getCollectionId(assetId);
            if (collectionId != 0) {
                catalyst = _catalysts[collectionId];
                baseTokenId = collectionId;
            }
        }
    }

    function _addGems(CatalystStored storage catalyst, uint256[] memory gemIds) internal {
        for (uint256 i = 0; i < gemIds.length; i++) {
            catalyst.gems.push(Gem({blockNumber: uint64(block.number + 1), id: uint32(gemIds[i])}));
        }
    }

    function _getCollectionId(uint256 assetId) internal view returns (uint256) {
        try _asset.collectionOf(assetId) returns (uint256 collectionId) {
            return collectionId;
        } catch {}
        return 0;
    }

    // CONSTRUCTOR ////
    constructor(AssetToken asset, address admin) public {
        _asset = asset;
        _admin = admin;
    }

    /// DATA ////////
    address _minter;
    mapping(uint256 => CatalystStored) _catalysts;
    AssetToken internal immutable _asset;
}
