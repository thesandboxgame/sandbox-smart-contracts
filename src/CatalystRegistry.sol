pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import "./Interfaces/AssetToken.sol";
import "./Catalyst/CatalystToken.sol";
import "./contracts_common/src/BaseWithStorage/Admin.sol";


contract CatalystRegistry is Admin {
    struct Catalyst {
        CatalystToken token;
        CatalystToken.Gem[] gems;
    }

    function setCatalyst(
        uint256 assetId,
        CatalystToken catalystToken,
        uint256[] calldata gemIds
    ) external {
        require(msg.sender == _admin, "NOT_AUTHORIZED");

        _catalysts[assetId].token = catalystToken;
        delete _catalysts[assetId].gems;
        _addGems(_catalysts[assetId], gemIds);
    }

    function addGems(uint256 assetId, uint256[] calldata gemIds) external {
        require(msg.sender == _admin, "NOT_AUTHORIZED");
        Catalyst storage catalyst = _catalysts[assetId];
        if (address(catalyst.token) == address(0)) {
            // copy if not set
            Catalyst storage parentCatalyst = _getCatalyst(assetId);
            catalyst.token = parentCatalyst.token;
            catalyst.gems = parentCatalyst.gems;
        }
        _addGems(catalyst, gemIds);
    }

    function getCatalyst(uint256 assetId) external view returns (Catalyst memory) {
        return _getCatalyst(assetId);
    }

    function getAttributes(uint256 assetId) external view returns (CatalystToken.Attribute[] memory) {
        Catalyst memory catalyst = _catalysts[assetId];
        if (address(catalyst.token) == address(0)) {
            uint256 collectionId = _getCollectionId(assetId);
            if (collectionId != 0) {
                catalyst = _catalysts[assetId];
            }
        }

        return catalyst.token.getAttributes(catalyst.gems);
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
            catalyst.gems.push(CatalystToken.Gem({blockNumber: uint64(block.number + 1), id: uint32(gemIds[i])}));
        }
    }

    function _getCollectionId(uint256 assetId) internal view returns (uint256) {
        try _asset.collectionOf(assetId) returns (uint256 collectionId) {
            return collectionId;
        } catch {}
        return 0;
    }

    // CONSTRUCTOR ////
    constructor(
        AssetToken asset,
        CatalystToken catalystToken,
        address admin
    ) public {
        _asset = asset;
        _catalystToken = catalystToken;
        _admin = admin;
    }

    /// DATA ////////
    mapping(uint256 => Catalyst) _catalysts;
    AssetToken internal immutable _asset;
    CatalystToken internal immutable _catalystToken;
}
