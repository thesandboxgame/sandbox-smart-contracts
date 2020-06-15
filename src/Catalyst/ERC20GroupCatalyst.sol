pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import "../BaseWithStorage/ERC20Group.sol";
import "./CatalystDataBase.sol";
import "../contracts_common/src/Interfaces/ERC20.sol";


contract ERC20GroupCatalyst is CatalystDataBase, ERC20Group {
    function addCatalysts(
        string[] memory names,
        CatalystData[] memory data,
        ERC20[] memory catalysts
    ) public {
        require(msg.sender == _admin, "only admin");
        require(names.length == data.length, "inconsistent length");
        uint256 count = _count;
        for (uint256 i = 0; i < data.length; i++) {
            _names[count + i] = names[i];
            _data[count + i] = data[i];
        }
        _count = count + data.length;
        // TODO add erc20

        // TODO event ?
    }

    function addCatalyst(
        string memory name,
        CatalystData memory data,
        ERC20 catalyst
    ) public {
        require(msg.sender == _admin, "only admin");
        uint256 count = _count;
        _names[count] = name;
        _data[count] = data;
        _count++;
        // TODO add erc20

        // TODO event ?
    }

    // /////////////////////
    uint256 _count;
    mapping(uint256 => string) _names;

    // ////////////////////////
    constructor(
        address metaTransactionContract,
        address admin,
        address initialMinter
    ) public ERC20Group(metaTransactionContract, admin, initialMinter) {}
}
