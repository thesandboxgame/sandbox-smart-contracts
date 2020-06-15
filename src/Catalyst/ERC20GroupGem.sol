pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import "../BaseWithStorage/ERC20Group.sol";


contract ERC20GroupGem is ERC20Group {
    function addGems(string[] memory names) public {
        require(msg.sender == _admin, "only admin");
        _addGems(names);
    }

    // TODO metadata + EIP-165

    // ///////////////////
    function _addGems(string[] memory names) internal {
        uint256 count = _count;
        for (uint256 i = 0; i < names.length; i++) {
            _names[count + i] = names[i];
        }
        _count = count + names.length;
        // TODO event ?
    }

    // /////////////////////
    uint256 _count;
    mapping(uint256 => string) _names;

    // ////////////////////////
    constructor(
        address metaTransactionContract,
        address admin,
        address initialMinter,
        string[] memory initialGems
    ) public ERC20Group(metaTransactionContract, admin, initialMinter) {
        _addGems(initialGems);
    }
}
