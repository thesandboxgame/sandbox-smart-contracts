pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import "./Interfaces/AssetToken.sol";
import "./contracts_common/src/BaseWithStorage/Admin.sol";


contract CatalystRegistry is Admin {
    event Minter(address indexed newMinter);
    event CatalystApplied(uint256 indexed assetId, uint256 catalystId, uint256[] gemIds, uint64 blockNumber);
    event GemsAdded(uint256 indexed assetId, uint256 catalystAssetId, uint256[] gemIds, uint64 blockNumber);

    function setCatalyst(
        uint256 assetId,
        uint256 catalystId,
        uint256 maxGems,
        uint256[] calldata gemIds
    ) external {
        require(msg.sender == _minter, "NOT_MINTER");
        require(gemIds.length <= maxGems, "too many gems");
        uint256 emptySockets = maxGems - gemIds.length;
        if (emptySockets == 0 && assetId & IS_NFT > 0) {
            // IF NFT We record as set to be zero via magic value 256**2-1
            emptySockets = 256**2 - 1;
        }
        _emptySockets[assetId] = emptySockets;
        uint64 blockNumber = _getBlockNumber();
        emit CatalystApplied(assetId, catalystId, gemIds, blockNumber);
    }

    function addGems(uint256 assetId, uint256[] calldata gemIds) external {
        require(gemIds.length > 0, "NO_GEMS_GIVEN");
        require(msg.sender == _minter, "NOT_MINTER");
        (uint256 emptySockets, uint256 catalystAssetId) = _getSocketData(assetId);
        require(emptySockets >= gemIds.length, "too many gems");
        emptySockets -= gemIds.length;
        if (emptySockets == 0 && assetId & IS_NFT > 0) {
            // IF NFT We record as set to be zero via magic value 256**2-1
            emptySockets = 256**2 - 1;
        }
        _emptySockets[assetId] = emptySockets;
        uint64 blockNumber = _getBlockNumber();
        emit GemsAdded(assetId, catalystAssetId, gemIds, blockNumber);
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

    uint256 private constant IS_NFT = 0x0000000000000000000000000000000000000000800000000000000000000000;

    function _getSocketData(uint256 assetId) internal view returns (uint256 emptySockets, uint256 fromAssetId) {
        fromAssetId = assetId;
        emptySockets = _emptySockets[assetId];
        if (assetId & IS_NFT > 0) {
            if (emptySockets != 0) {
                if (emptySockets == 256**2 - 1) {
                    emptySockets = 0;
                }
            } else {
                fromAssetId = _getCollectionId(assetId);
                emptySockets = _emptySockets[fromAssetId];
            }
        }
    }

    function _getBlockNumber() internal view returns (uint64 blockNumber) {
        blockNumber = uint64(block.number + 1);
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
    AssetToken internal immutable _asset;
    mapping(uint256 => uint256) _emptySockets;
}
