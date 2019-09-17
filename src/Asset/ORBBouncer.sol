pragma solidity 0.5.9;

import "./Interfaces/AssetBouncer.sol";
import "./ERC1155ERC721.sol";
import "../../contracts_common/src/Interfaces/ERC20.sol";

contract ORBBouncer is AssetBouncer {
    ERC1155ERC721 asset;
    mapping(address => bool) metaTransactionContracts; // native meta-transaction support

    constructor(address _metaTransactionContract, ERC1155ERC721 _asset) public {
        asset = _asset;
        metaTransactionContracts[_metaTransactionContract] = true;
    }
    // TODO add metatransaction contract

    function mint(
        address _sender,
        uint256 _fee,
        ERC20 _feeToken,
        uint48 _packId,
        bytes32 _hash,
        uint32 _supply,
        address _owner,
        bytes memory _data
    ) public returns (uint256 tokenId) {
        require(
            msg.sender == _sender || metaTransactionContracts[msg.sender],
            "not authorized"
        );
        return asset.mint(_sender, _packId, _hash, _supply, 0, _owner, _data); // TODO compare gas cost of paramter vs callData
    }

    function mintMultiple(
        address _sender,
        uint256 _fee,
        ERC20 _feeToken,
        uint48 _packId,
        bytes32 _hash,
        uint256[] memory _supplies,
        address _owner,
        bytes memory _data
    ) public returns (uint256[] memory tokenIds) {
        require(
            msg.sender == _sender || metaTransactionContracts[msg.sender],
            "not authorized"
        );
        bytes memory rarityPack = new bytes(0);
        return
            asset.mintMultiple(
                _sender,
                _packId,
                _hash,
                _supplies,
                rarityPack,
                _owner,
                _data
            );
    }
}
