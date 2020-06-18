pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import "./Interfaces/AssetToken.sol";
import "./contracts_common/src/BaseWithStorage/Admin.sol";

contract CatalystRegistry is Admin {
    event Minter(address indexed newMinter);
    event CatalystApplied(uint256 indexed assetId, uint256 indexed catalystId, uint256 seed, uint256[] gemIds, uint64 blockNumber);
    event GemsAdded(uint256 indexed assetId, uint256 seed, uint256 startIndex, uint256[] gemIds, uint64 blockNumber);

    function getCatalyst(uint256 assetId) external view returns (bool exists, uint256 catalystId) {
        CatalystStored memory catalyst = _catalysts[assetId];
        if (catalyst.set != 0) {
            return (true, catalyst.catalystId);
        }
        if (assetId & IS_NFT > 0) {
            catalyst = _catalysts[_getCollectionId(assetId)];
            return (catalyst.set != 0, catalyst.catalystId);
        }
        return (false, 0);
    }

    function setCatalyst(
        uint256 assetId,
        uint256 catalystId,
        uint256 maxGems,
        uint256[] calldata gemIds
    ) external {
        require(msg.sender == _minter, "NOT_AUTHORIZED_MINTER");
        require(gemIds.length <= maxGems, "INVALID_GEMS_TOO_MANY");
        uint256 emptySockets = maxGems - gemIds.length;
        uint256 index = gemIds.length;
        _catalysts[assetId].emptySockets = uint64(emptySockets);
        _catalysts[assetId].index = uint64(index);
        _catalysts[assetId].catalystId = uint64(catalystId);
        _catalysts[assetId].set = 1;
        uint64 blockNumber = _getBlockNumber();
        emit CatalystApplied(assetId, catalystId, _getSeed(assetId), gemIds, blockNumber);
    }

    function addGems(uint256 assetId, uint256[] calldata gemIds) external {
        require(msg.sender == _minter, "NOT_AUTHORIZED_MINTER");
        require(assetId & IS_NFT > 0, "INVALID_NOT_NFT");
        require(gemIds.length > 0, "INVALID_GEMS_0");
        (uint256 emptySockets, uint256 index, uint256 seed) = _getSocketData(assetId);
        uint256 startIndex = index;
        require(emptySockets >= gemIds.length, "INVALID_GEMS_TOO_MANY");
        emptySockets -= gemIds.length;
        index += gemIds.length;
        _catalysts[assetId].emptySockets = uint64(emptySockets);
        _catalysts[assetId].index = uint64(index);
        uint64 blockNumber = _getBlockNumber();
        emit GemsAdded(assetId, seed, startIndex, gemIds, blockNumber);
    }

    /// @dev Set the Minter that will be the only address able to create Estate
    /// @param minter address of the minter
    function setMinter(address minter) external {
        require(msg.sender == _admin, "NOT_AUTHORIZED_ADMIN");
        require(minter != _minter, "INVALID_MINTER_SAME_ALREADY_SET");
        _minter = minter;
        emit Minter(minter);
    }

    /// @dev return the current minter
    function getMinter() external view returns (address) {
        return _minter;
    }

    // ///////// INTERNAL ////////////

    uint256 private constant IS_NFT = 0x0000000000000000000000000000000000000000800000000000000000000000;
    uint256 private constant NOT_IS_NFT = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF7FFFFFFFFFFFFFFFFFFFFFFF;
    uint256 private constant NOT_NFT_INDEX = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF800000007FFFFFFFFFFFFFFF;

    function _getSeed(uint256 assetId) internal pure returns (uint256) {
        if (assetId & IS_NFT > 0) {
            return _getCollectionId(assetId);
        }
        return assetId;
    }

    function _getSocketData(uint256 assetId)
        internal
        view
        returns (
            uint256 emptySockets,
            uint256 index,
            uint256 seed
        )
    {
        seed = assetId;
        CatalystStored memory catalyst = _catalysts[assetId];
        if (catalyst.set != 0) {
            return (catalyst.emptySockets, catalyst.index, seed);
        }
        if (assetId & IS_NFT > 0) {
            seed = _getCollectionId(assetId);
            catalyst = _catalysts[seed];
            return (catalyst.emptySockets, catalyst.index, seed);
        }
        return (0, 0, seed); // Should not reach here
    }

    function _getBlockNumber() internal view returns (uint64 blockNumber) {
        blockNumber = uint64(block.number + 1);
    }

    function _getCollectionId(uint256 assetId) internal pure returns (uint256) {
        return assetId & NOT_NFT_INDEX & NOT_IS_NFT; // compute the same as Asset to get collectionId
    }

    // CONSTRUCTOR ////
    constructor(AssetToken asset, address admin) public {
        _asset = asset;
        _admin = admin;
    }

    /// DATA ////////

    struct CatalystStored {
        uint64 emptySockets;
        uint64 index;
        uint64 catalystId;
        uint64 set;
    }
    address _minter;
    AssetToken internal immutable _asset;
    mapping(uint256 => CatalystStored) _catalysts;
}
