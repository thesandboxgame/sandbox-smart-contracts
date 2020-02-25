pragma solidity 0.5.9;

import "../../../contracts_common/src/Interfaces/ERC20.sol";

interface MintingFeeCollector {
    function newFee(ERC20 _newFeeToken, uint256 _newFee) external;
    function multiple_minted(uint256[] calldata tokenIds) external;
    function single_minted(uint256 tokenId) external;
}
