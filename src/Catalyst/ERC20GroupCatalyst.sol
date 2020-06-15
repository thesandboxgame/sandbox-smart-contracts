pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import "../BaseWithStorage/ERC20Group.sol";
import "./CatalystDataBase.sol";
import "../BaseWithStorage/ERC20SubToken.sol";


contract ERC20GroupCatalyst is CatalystDataBase, ERC20Group {
    function addCatalysts(ERC20SubToken[] memory catalysts, CatalystData[] memory data) public {
        require(msg.sender == _admin, "only admin");
        require(catalysts.length == data.length, "inconsistent length");
        uint256 count = _count;
        for (uint256 i = 0; i < data.length; i++) {
            _data[count + i] = data[i];
            _addSubToken(catalysts[i]);
        }
        _count = count + data.length;
        // TODO event ?
    }

    function addCatalyst(ERC20SubToken catalyst, CatalystData memory data) public {
        require(msg.sender == _admin, "only admin");
        uint256 count = _count;
        _data[count] = data;
        _count++;
        _addSubToken(catalyst);
        // TODO event ?
    }

    // /////////////////////
    uint256 _count;

    // ////////////////////////
    constructor(
        address metaTransactionContract,
        address admin,
        address initialMinter
    ) public ERC20Group(metaTransactionContract, admin, initialMinter) {}
}
