pragma solidity 0.5.9;

import "./ERC1155ERC721.sol";
import "../contracts_common/BaseWithStorage/Admin.sol";

contract GenesisBouncer is Admin {
    ERC1155ERC721 _asset;
    mapping(address => bool) _minters;

    constructor(ERC1155ERC721 asset, address genesisAdmin, address firstMinter)
        public
    {
        _asset = asset;
        _admin = genesisAdmin;
        _setMinter(firstMinter, true);
    }

    event MinterUpdated(address minter, bool allowed);
    function _setMinter(address minter, bool allowed) internal {
        _minters[minter] = allowed;
        emit MinterUpdated(minter, allowed);
    }
    function setMinter(address minter, bool allowed) external {
        require(msg.sender == _admin, "only admin can allocate minter");
        _setMinter(minter, allowed);
    }

    function mintFor(
        address creator,
        uint40 packId,
        bytes32 hash,
        uint32 supply,
        uint8 rarity,
        address owner
    ) public returns (uint256 tokenId) {
        require(_minters[msg.sender], "not authorized");
        return
            _asset.mint(creator, packId, hash, supply, rarity, owner, "");
    }

    function mintMultipleFor(
        address creator,
        uint40 packId,
        bytes32 hash,
        uint256[] memory supplies,
        bytes memory rarityPack,
        address owner
    ) public returns (uint256[] memory ids) {
        require(_minters[msg.sender], "not authorized");
        return
            _asset.mintMultiple(
                creator,
                packId,
                hash,
                supplies,
                rarityPack,
                owner,
                ""
            );
    }
}
