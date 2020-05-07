pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import "../Interfaces/AssetToken.sol";
import "./CatalystToken.sol";
import "../contracts_common/src/BaseWithStorage/Admin.sol";

contract CatalystRegistry is Admin {

    struct Gem {
        uint64 blockNumber;
        uint32 id;
    }

    struct Catalyst {
        CatalystToken token;
        Gem[] gems;
    }

    struct Attribute {
        uint32 gemId;
        uint32 value;
    }

    function setCatalyst(uint256 assetId, CatalystToken catalystToken, uint256[] calldata gemIds) external {
        require(msg.sender == _admin, "NOT_AUTHORIZED");

        _catalysts[assetId].token = catalystToken;
        _addGems(_catalysts[assetId], gemIds);
    }

    function getCatalyst(uint256 assetId) external view returns(Catalyst memory) {
        Catalyst memory catalyst = _catalysts[assetId];
        if (address(catalyst.token) == address(0)) {
            uint256 collectionId = _getCollectionId(assetId);
            if (collectionId != 0) {
                catalyst = _catalysts[assetId];
            }
        }
        return catalyst;
    }

    function getAttributes(uint256 assetId) external view returns(Attribute[] memory) {
        Catalyst memory catalyst = _catalysts[assetId];
        if (address(catalyst.token) == address(0)) {
            uint256 collectionId = _getCollectionId(assetId);
            if (collectionId != 0) {
                catalyst = _catalysts[assetId];
            }
        }
        Attribute[] memory attributes = new Attribute[](catalyst.gems.length);
        for (uint256 i = 0; i < attributes.length; i++) {
            Gem memory gem = catalyst.gems[i];
            attributes[i] = Attribute({
                gemId: uint32(gem.id), // TODO require value not overflow
                value: _catalystToken.getValue(gem.id, i, gem.blockNumber)
            });
        }
        return attributes;
    }

    // ///////// INTERNAL ////////////

    function _addGems(Catalyst storage catalyst, uint256[] memory gemIds) internal {
        for(uint256 i = 0; i < gemIds.length; i++) {
            catalyst.gems.push(Gem({
                blockNumber: uint64(block.number),
                id: uint32(gemIds[i])
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
    constructor(AssetToken asset, CatalystToken catalystToken, address admin) public {
        _asset = asset;
        _catalystToken = catalystToken;
        _admin = admin;
    }

    /// DATA ////////
    mapping(uint256 => Catalyst) _catalysts;
    AssetToken internal immutable _asset;
    CatalystToken internal immutable _catalystToken;
}
