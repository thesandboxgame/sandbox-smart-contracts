pragma solidity 0.5.9;

import "./ERC1155ERC721.sol";
import "../contracts_common/Interfaces/ERC20.sol";
import "../contracts_common/BaseWithStorage/MetaTransactionReceiver.sol";
import "../contracts_common/Libraries/SafeMathWithRequire.sol";

contract CommonMinter is MetaTransactionReceiver {
    using SafeMathWithRequire for uint256;

    uint256 _feePerCopy;

    ERC1155ERC721 _asset;
    mapping(address => bool) _minters;
    address _feeReceiver;
    ERC20 _sand;

    constructor(ERC1155ERC721 asset, ERC20 sand, uint256 feePerCopy, address admin, address feeReceiver)
        public
    {
        _sand = sand;
        _asset = asset;
        _feePerCopy = feePerCopy;
        _admin = admin;
        _feeReceiver = feeReceiver;
        _setMetaTransactionProcessor(address(sand), true);
    }

    /// @notice set the receiver of the proceeds
    /// @param newFeeReceiver address of the new fee receiver
    function setFeeReceiver(address newFeeReceiver) external {
        require(msg.sender == _admin, "only admin can change the receiver");
        _feeReceiver = newFeeReceiver;
    }

    /// @notice set the fee in Sand for each common Asset copies
    /// @param newFee new fee in Sand
    function setFeePerCopy(uint256 newFee) external {
        require(msg.sender == _admin, "only admin allowed to set fee");
        _feePerCopy = newFee;
    }

    /// @notice mint common Asset token by paying the Sand fee
    /// @param creator address creating the Asset, need to be the tx sender or meta tx signer
    /// @param packId unused packId that will let you predict the resulting tokenId
    /// @param hash cidv1 ipfs hash of the folder where 0.json file contains the metadata
    /// @param supply number of copies to mint, cost in Sand is relative it it
    /// @param owner address receiving the minted tokens
    /// @param data extra data
    /// @param feePerCopy fee in Sand for each copies
    function mintFor(
        address creator,
        uint40 packId,
        bytes32 hash,
        uint32 supply,
        address owner,
        bytes calldata data,
        uint256 feePerCopy
    ) external returns (uint256 id) {
        require(creator == msg.sender || _metaTransactionContracts[msg.sender], "not authorized");
        require(feePerCopy == _feePerCopy, "invalid fee");
        require(_sand.transferFrom(creator, _feeReceiver, uint256(supply).mul(feePerCopy)), "failed to transfer SAND");
        return _asset.mint(creator, packId, hash, supply, 0, owner, data);
    }

    /// @notice mint multiple common Asset tokena by paying the Sand fee
    /// @param creator address creating the Asset, need to be the tx sender or meta tx signer
    /// @param packId unused packId that will let you predict the resulting tokenId
    /// @param hash cidv1 ipfs hash of the folder where 0.json file contains the metadata
    /// @param supplies number of copies to mint for each Asset, cost in Sand is relative it it
    /// @param owner address receiving the minted tokens
    /// @param data extra data
    /// @param feePerCopy fee in Sand for each copies
    function mintMultipleFor(
        address creator,
        uint40 packId,
        bytes32 hash,
        uint256[] calldata supplies,
        address owner,
        bytes calldata data,
        uint256 feePerCopy
    ) external returns (uint256[] memory ids) {
        require(creator == msg.sender || _metaTransactionContracts[msg.sender], "not authorized");
        require(feePerCopy == _feePerCopy, "invalid fee");
        uint256 totalCopies = 0;
        uint256 numAssetTypes = supplies.length;
        for (uint256 i = 0; i < numAssetTypes; i++) {
            totalCopies = totalCopies.add(supplies[i]);
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
