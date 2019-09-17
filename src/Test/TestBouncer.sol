pragma solidity 0.5.9;

import "../Asset/Interfaces/AssetBouncer.sol";
import "../Asset/ERC1155ERC721.sol";

contract TestBouncer is AssetBouncer {
    ERC1155ERC721 asset;

    constructor(ERC1155ERC721 _asset)
        public
    {
        asset = _asset;
    }

    function mintFor(
        address _creator,
        uint48 _packId,
        bytes32 _hash,
        uint32 _supply,
        uint8 _rarity,
        address _owner
    ) public returns (uint256 tokenId) {
        return
            asset.mint(_creator, _packId, _hash, _supply, _rarity, _owner, "");
    }

    function mintMultipleFor(
        address _creator,
        uint48 _packId,
        bytes32 _hash,
        uint256[] memory _supplies,
        bytes memory _rarityPack,
        address _owner
    ) public returns (uint256[] memory tokenIds) {
        return
            asset.mintMultiple(
                _creator,
                _packId,
                _hash,
                _supplies,
                _rarityPack,
                _owner,
                ""
            );
    }

    function updateERC721(
        address _from,
        uint256 _tokenId,
        uint48 _packId,
        bytes32 _hash,
        uint8 _newRarity,
        address _to
    ) external returns(uint256) {
        return
            asset.updateERC721(
                _from,
                _tokenId,
                _packId,
                _hash,
                _newRarity,
                _to,
                ""
            );
    }
}
