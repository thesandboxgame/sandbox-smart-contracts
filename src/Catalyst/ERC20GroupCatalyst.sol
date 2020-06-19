pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import "../BaseWithStorage/ERC20Group.sol";
import "./CatalystDataBase.sol";
import "../BaseWithStorage/ERC20SubToken.sol";

contract ERC20GroupCatalyst is CatalystDataBase, ERC20Group {
    function addCatalysts(ERC20SubToken[] memory catalysts, CatalystData[] memory data) public {
        require(msg.sender == _admin, "NOT_AUTHORIZED_ADMIN");
        require(catalysts.length == data.length, "INVALID_INCONSISTENT_LENGTH");
        for (uint256 i = 0; i < data.length; i++) {
            uint256 id = _addSubToken(catalysts[i]);
            _setData(id, data[i]);
        }
    }

    function addCatalyst(ERC20SubToken catalyst, CatalystData memory data) public {
        require(msg.sender == _admin, "NOT_AUTHORIZED_ADMIN");
        uint256 id = _addSubToken(catalyst);
        _setData(id, data);
    }

    function setConfiguration(
        uint256 id,
        uint16 minQuantity,
        uint16 maxQuantity,
        uint256 sandMintingFee,
        uint256 sandUpdateFee
    ) external {
        // CatalystMinter hardcode the value for efficiency purpose, so a change here would require a new deployment of CatalystMinter
        require(msg.sender == _admin, "NOT_AUTHORIZED_ADMIN");
        _setConfiguration(id, minQuantity, maxQuantity, sandMintingFee, sandUpdateFee);
    }

    constructor(
        address metaTransactionContract,
        address admin,
        address initialMinter
    ) public ERC20Group(metaTransactionContract, admin, initialMinter) {}
}
