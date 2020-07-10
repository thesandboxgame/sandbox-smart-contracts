pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import "../BaseWithStorage/ERC20Group.sol";
import "./CatalystDataBase.sol";
import "../BaseWithStorage/ERC20SubToken.sol";
import "./CatalystValue.sol";


contract ERC20GroupCatalyst is CatalystDataBase, ERC20Group {
    function addCatalysts(
        ERC20SubToken[] memory catalysts,
        MintData[] memory mintData,
        CatalystValue[] memory valueOverrides
    ) public {
        require(msg.sender == _admin, "NOT_AUTHORIZED_ADMIN");
        require(catalysts.length == mintData.length, "INVALID_INCONSISTENT_LENGTH");
        for (uint256 i = 0; i < mintData.length; i++) {
            uint256 id = _addSubToken(catalysts[i]);
            _setMindData(id, mintData[i]);
            if (valueOverrides.length > i) {
                _setValueOverride(id, valueOverrides[i]);
            }
        }
    }

    function addCatalyst(
        ERC20SubToken catalyst,
        MintData memory mintData,
        CatalystValue valueOverride
    ) public {
        require(msg.sender == _admin, "NOT_AUTHORIZED_ADMIN");
        uint256 id = _addSubToken(catalyst);
        _setMindData(id, mintData);
        _setValueOverride(id, valueOverride);
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
