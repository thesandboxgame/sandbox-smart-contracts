//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.1;
pragma experimental ABIEncoderV2;

import "../common/BaseWithStorage/WithAdmin.sol";
import "../common/BaseWithStorage/WithMinter.sol";
import "./GemsAndCatalysts.sol";

contract AssetAttributesRegistry is WithAdmin, WithMinter {
    uint256 internal constant MAX_NUM_GEMS = 15;
    uint256 private constant IS_NFT = 0x0000000000000000000000000000000000000000800000000000000000000000;
    uint256 private constant NOT_IS_NFT = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF7FFFFFFFFFFFFFFFFFFFFFFF;
    uint256 private constant NOT_NFT_INDEX = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF800000007FFFFFFFFFFFFFFF;

    GemsAndCatalysts immutable _gemsAndCatalysts;
    mapping(uint256 => Record) internal _records;

    struct GemEvent {
        uint16[] gemIds;
        bytes32 blockHash;
    }

    struct Record {
        uint16 catalystId; // start at 1
        uint16[MAX_NUM_GEMS] gemIds; // start at 1 test compression ? // TODO check with Design if the limit make sense
    }

    event CatalystApplied(uint256 indexed assetId, uint16 indexed catalystId, uint16[] gemIds, uint64 blockNumber);
    event GemsAdded(uint256 indexed assetId, uint16[] gemIds, uint64 blockNumber);

    constructor(GemsAndCatalysts gemsAndCatalysts, address admin) {
        _gemsAndCatalysts = gemsAndCatalysts;
        _admin = admin;
    }

    function getRecord(uint256 assetId)
        external
        view
        returns (
            bool exists,
            uint16 catalystId,
            uint16[] memory gemIds
        )
    {
        catalystId = _records[assetId].catalystId;
        uint16[MAX_NUM_GEMS] memory fixedGemIds = _records[assetId].gemIds;
        exists = catalystId != 0;
        gemIds = new uint16[](0);
        uint8 i = 0;
        while (fixedGemIds[i] != 0) {
            gemIds[i] = (fixedGemIds[i]);
            i++;
        }
    }

    function setCatalyst(
        uint256 assetId,
        uint16 catalystId,
        uint16[] calldata gemIds
    ) external {
        require(msg.sender == _minter, "NOT_AUTHORIZED_MINTER");
        require(assetId & IS_NFT != 0, "INVALID_NOT_NFT");
        require(gemIds.length <= MAX_NUM_GEMS, "GEMS_MAX_REACHED");
        uint8 maxGems = _gemsAndCatalysts.getMaxGems(_records[assetId].catalystId);
        require(gemIds.length <= maxGems, "GEMS_TOO_MANY");

        uint16[MAX_NUM_GEMS] memory gemIdsToStore;
        for (uint8 i = 0; i < MAX_NUM_GEMS; i++) {
            gemIdsToStore[i] = gemIds[i];
        }
        _records[assetId] = Record(catalystId, gemIdsToStore);
        uint64 blockNumber = _getBlockNumber();
        emit CatalystApplied(assetId, catalystId, gemIds, blockNumber);
    }

    function addGems(uint256 assetId, uint16[] calldata gemIds) external {
        require(msg.sender == _minter, "NOT_AUTHORIZED_MINTER");
        require(assetId & IS_NFT != 0, "INVALID_NOT_NFT");
        require(gemIds.length != 0, "INVALID_GEMS_0");
        uint16[15] memory gemIdsToStore = _records[assetId].gemIds;
        uint8 j = 0;
        uint8 i = 0;
        for (i = 0; i < MAX_NUM_GEMS; i++) {
            if (j >= gemIds.length) {
                break;
            }
            if (gemIdsToStore[i] == 0) {
                gemIdsToStore[i] = gemIds[j];
                j++;
            }
            i++;
        }
        uint8 maxGems = _gemsAndCatalysts.getMaxGems(_records[assetId].catalystId);
        require(i <= maxGems, "GEMS_TOO_MANY");
        require(j >= gemIds.length, "GEMS_MAX_REACHED");
        _records[assetId].gemIds = gemIdsToStore;
        uint64 blockNumber = _getBlockNumber();
        emit GemsAdded(assetId, gemIds, blockNumber);
    }

    function getAttributes(uint256 assetId, GemEvent[] calldata events) external view returns (uint32[] memory values) {
        return _gemsAndCatalysts.getAttributes(_records[assetId].catalystId, assetId, events);
    }

    function _getBlockNumber() internal view returns (uint64 blockNumber) {
        blockNumber = uint64(block.number + 1);
    }
}
