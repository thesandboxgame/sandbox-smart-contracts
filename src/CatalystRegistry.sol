pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import "./Interfaces/AssetToken.sol";
import "./contracts_common/src/BaseWithStorage/Admin.sol";


contract CatalystRegistry is Admin {
    event Minter(address indexed newMinter);
    event CatalystApplied(uint256 indexed assetId, uint256 indexed catalystId, uint256 seed, uint256[] gemIds, uint64 blockNumber);
    event GemsAdded(uint256 indexed assetId, uint256 seed, uint256 startIndex, uint256[] gemIds, uint64 blockNumber);

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
        if (emptySockets == 0) {
            if (assetId & IS_NFT > 0) {
                // IF NFT We record as set to be zero via magic value 2**128-1
                emptySockets = 2**128 - 1;
            }
            index = 0; // do not bother storing the index as the sockets are full
        }
        _sockets[assetId].emptySockets = uint128(emptySockets);
        _sockets[assetId].index = uint128(index);
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
        if (emptySockets == 0) {
            // IF NFT We record as set to be zero via magic value 2**128-1
            emptySockets = 2**128 - 1;
        }
        _sockets[assetId].emptySockets = uint128(emptySockets);
        _sockets[assetId].index = uint128(index);
        uint64 blockNumber = _getBlockNumber();
        emit GemsAdded(assetId, seed, startIndex, gemIds, blockNumber);
    }

    /// @notice Set the Minter that will be the only address able to create Estate
    /// @param minter address of the minter
    function setMinter(address minter) external {
        require(msg.sender == _admin, "NOT_AUTHORIZED_ADMIN");
        require(minter != _minter, "INVALID_MINTER_SAME_ALREADY_SET");
        _minter = minter;
        emit Minter(minter);
    }

    /// @notice return the current minter
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
        emptySockets = _sockets[assetId].emptySockets;
        index = _sockets[assetId].index;
        if (assetId & IS_NFT > 0) {
            seed = _getCollectionId(assetId); // for nft the seed is always the collection assetId to ensure the gems added and gems already present are generated with same seed
            if (emptySockets != 0) {
                if (emptySockets == 2**128 - 1) {
                    emptySockets = 0;
                }
            } else {
                emptySockets = _sockets[seed].emptySockets;
                index = _sockets[seed].index;
            }
        }
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

    struct Sockets {
        uint128 emptySockets;
        uint128 index;
    }
    address _minter;
    AssetToken internal immutable _asset;
    mapping(uint256 => Sockets) _sockets;
}
