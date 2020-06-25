pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import "../../BaseWithStorage/wip/MintableERC1155Token.sol";
import "../CatalystDataBase.sol";


contract ERC1155Catalyst is CatalystDataBase, MintableERC1155Token {
    function addCatalysts(string[] memory names, CatalystData[] memory data) public {
        require(msg.sender == _admin, "NOT_AUTHORIZED_ADMIN");
        require(names.length == data.length, "INVALID_INCONSISTENT_LENGTH");
        uint256 count = _count;
        for (uint256 i = 0; i < data.length; i++) {
            _names[count + i] = names[i];
            _data[count + i] = data[i];
        }
        _count = count + data.length;
        // TODO event
    }

    function addCatalyst(string memory name, CatalystData memory data) public {
        require(msg.sender == _admin, "NOT_AUTHORIZED_ADMIN");
        uint256 count = _count;
        _names[count] = name;
        _data[count] = data;
        _count++;
        // TODO event
    }

    // TODO metadata + EIP-165

    // ///////////////////////// STORAGE /////////////////////////////////
    uint256 _count;
    mapping(uint256 => string) _names;

    // ///////////////////////////////////////////////////////////////////
    constructor(
        address metaTransactionContract,
        address admin,
        address initialMinter
    ) public MintableERC1155Token(metaTransactionContract, admin, initialMinter) {}
}
