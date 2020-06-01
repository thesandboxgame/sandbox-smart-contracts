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

    struct Catalyst {
        CatalystToken token;
        Gem[] gems;
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
        Catalyst storage catalyst = _catalysts[assetId];
        address catalystToken = address(catalyst.token);
        if (catalystToken == address(0)) {
            // copy if not set
            Catalyst storage parentCatalyst = _getCatalyst(assetId);
            catalyst.token = parentCatalyst.token;
            catalyst.gems = parentCatalyst.gems;
        }
        _addGems(catalyst, gemIds);
        emit GemsSocketed(assetId, catalystToken, gemIds);
    }

    function getCatalyst(uint256 assetId) external view returns (Catalyst memory) {
        return _getCatalyst(assetId);
    }

    /// @notice return the attributes for a particular asset.
    /// @param assetId tokenId of the Asset.
    /// @return attributes the attributes associatted with that token.
    function getAttributes(uint256 assetId, bytes32[] calldata blockHashes) external view returns (Attribute[] memory attributes) {
        Catalyst storage catalyst = _getCatalyst(assetId);
        Gem[] memory gems = catalyst.gems;
        require(gems.length == blockHashes.length, "invalid number of blockHash");
        attributes = new Attribute[](gems.length);
        for (uint256 i = 0; i < gems.length; i++) {
            uint32 gemId = gems[i].id;
            attributes[i] = Attribute({gemId: gemId, value: catalyst.token.getValue(gemId, i, blockHashes[i])});
        }
    }

    /// @notice return the list of blockNumbers for each socket.
    /// @param assetId tokenId of the Asset.
    /// @return blockNumbers list of blockNumber for each gems.
    function getAttributesBlockNumbers(uint256 assetId) external view returns (uint64[] memory blockNumbers) {
        Catalyst storage catalyst = _getCatalyst(assetId);
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

    function _getCatalyst(uint256 assetId) internal view returns (Catalyst storage) {
        Catalyst storage catalyst = _catalysts[assetId];
        if (address(catalyst.token) == address(0)) {
            uint256 collectionId = _getCollectionId(assetId);
            if (collectionId != 0) {
                catalyst = _catalysts[assetId];
            }
        }
        return catalyst;
    }

    function _addGems(Catalyst storage catalyst, uint256[] memory gemIds) internal {
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
    mapping(uint256 => Catalyst) _catalysts;
    AssetToken internal immutable _asset;
}
