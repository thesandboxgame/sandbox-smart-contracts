pragma solidity 0.5.9;

import "../Asset/Interfaces/MintingFeeCollector.sol";
import "../Asset/Interfaces/AssetBouncer.sol";

import "../Asset.sol";
import "../../contracts_common/src/Interfaces/ERC20.sol";

contract TestMintingFeeCollector is MintingFeeCollector {
    mapping(uint256 => uint256) stakes;

    AssetBouncer from;
    address owner;
    uint256 feePerToken;
    ERC20 acceptedFeeToken;
    constructor(address _owner, AssetBouncer _from, ERC20 _acceptedFeeToken)
        public
    {
        from = _from;
        owner = _owner;
        acceptedFeeToken = _acceptedFeeToken;
    }

    function newFee(ERC20 _newFeeToken, uint256 _newFee) external {
        require(msg.sender == address(from), "only accepting from Asset");
        require(_newFeeToken == acceptedFeeToken, "token type not accepted");
        feePerToken = _newFee;
    }

    function multiple_minted(uint256[] calldata tokenIds) external {
        require(msg.sender == address(from), "only accepting from Asset");
        for (uint256 i = 0; i < tokenIds.length; i++) {
            stakes[tokenIds[i]] = feePerToken;
        }
    }

    function single_minted(uint256 tokenId) external {
        require(msg.sender == address(from), "only accepting from Asset");
        stakes[tokenId] = feePerToken;
    }

    // TODO ? or remove FeeCollector entirely, bouncer will be doing the job. what is needed is a
    // function setFeeCollection(address newCollector, ERC20 newFeeToken, uint256 newFee) external {
    //     require(msg.sender == owner);
    //     from.setFeeCollection(newCollector, newFeeToken, newFee);
    // }

}
