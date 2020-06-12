pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import "./BaseWithStorage/MintableERC1155Token.sol";


contract Gem is MintableERC1155Token {
    function addGems(string[] calldata names) external {
        require(msg.sender == _admin, "only admin");
        uint256 count = _count;
        for (uint256 i = 0; i < names.length; i++) {
            _names[count + i] = names[i];
        }
        _count = count + names.length;
    }

    // TODO metadata + EIP-165

    // /////////////////////
    uint256 _count;
    mapping(uint256 => string) _names;

    // ////////////////////////
    constructor(
        address metaTransactionContract,
        address admin,
        address initialMinter
    ) public MintableERC1155Token(metaTransactionContract, admin, initialMinter) {}
}
