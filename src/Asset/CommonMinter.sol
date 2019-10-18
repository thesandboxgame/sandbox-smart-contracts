pragma solidity 0.5.9;

import "./ERC1155ERC721.sol";
import "../../contracts_common/src/Interfaces/ERC20.sol";
import "../../contracts_common/src/BaseWithStorage/MetaTransactionReceiver.sol";
import "../../contracts_common/src/Libraries/SafeMathWithRequire.sol";

contract CommonMinter is MetaTransactionReceiver {
    using SafeMathWithRequire for uint256;

    uint256 private constant feePerCopy = 1000000000000000000;

    ERC1155ERC721 _asset;
    mapping(address => bool) _minters;
    address _feeReceiver;
    ERC20 _sand;

    constructor(ERC1155ERC721 asset, ERC20 sand, address feeReceiver)
        public
    {
        _sand = sand;
        _asset = asset;
        _feeReceiver = feeReceiver;
        _setMetaTransactionProcessor(address(sand), true);
    }

    function mintFor(
        address creator,
        uint48 packId,
        bytes32 hash,
        uint32 supply,
        address owner,
        bytes calldata data
    ) external returns (uint256 id) {
        require(creator == msg.sender || _metaTransactionContracts[msg.sender], "not authorized");
        require(_sand.transferFrom(creator, _feeReceiver, uint256(supply).mul(feePerCopy)), "failed to transfer SAND");
        return _asset.mint(creator, packId, hash, supply, 0, owner, data);
    }

    function mintMultipleFor(
        address creator,
        uint48 packId,
        bytes32 hash,
        uint256[] calldata supplies,
        address owner,
        bytes calldata data
    ) external returns (uint256[] memory ids) {
        require(creator == msg.sender || _metaTransactionContracts[msg.sender], "not authorized");
        uint256 totalCopies = 0;
        uint256 numAssetTypes = supplies.length;
        for (uint256 i = 0; i < numAssetTypes; i++) {
            totalCopies += supplies[i];
        }
        require(_sand.transferFrom(creator, _feeReceiver, totalCopies.mul(feePerCopy)), "failed to transfer SAND");
        return
            _asset.mintMultiple(
                creator,
                packId,
                hash,
                supplies,
                "",
                owner,
                data
            );
    }
}
