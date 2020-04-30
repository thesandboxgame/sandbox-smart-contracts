pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import "./AssetToken.sol";
import "../contracts_common/src/BaseWithStorage/Admin.sol";

contract CatalystRegistry is Admin {

    struct Gem {
        uint64 blockNumber;
        uint32 gemId;
    }

    struct Catalyst {
        uint32 id;
        Gem[] gems;
    }

    function setCatalyst(uint256 assetId, uint32 catalystId, uint32[] calldata gemIds) external {
        require(msg.sender == _admin, "NOT_AUTHORIZED");

        _catalysts[assetId].id = catalystId;
        _addGems(_catalysts[assetId], gemIds);
    }

    function addGems(uint256 assetId, uint32[] calldata gemIds) external {
        require(msg.sender == _admin, "NOT_AUTHORIZED");
        _addGems(_catalysts[assetId], gemIds);
    }

    function getCatalyst(uint256 assetId) external view returns(Catalyst memory) {
        Catalyst memory catalyst = _catalysts[assetId];
        if (catalyst.id == 0) {
            uint256 collectionId = _getCollectionId(assetId);
            if (collectionId != 0) {
                catalyst = _catalysts[assetId];
            }
        }
        return catalyst;
    }

    // ///////// INTERNAL ////////////

    function _addGems(Catalyst storage catalyst, uint32[] memory gemIds) internal {
        for(uint256 i = 0; i < gemIds.length; i++) {
            catalyst.gems.push(Gem({
                blockNumber: uint64(block.number),
                gemId: gemIds[i]
            }));
        }
    }

    function _getCollectionId(uint256 assetId) internal view returns (uint256) {
        try _asset.collectionOf(assetId) returns(uint256 collectionId) {
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
    mapping(uint256 => Catalyst) _catalysts;
    AssetToken internal immutable _asset;
}
