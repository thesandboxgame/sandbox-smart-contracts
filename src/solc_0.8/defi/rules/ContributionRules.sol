//SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import {Ownable} from "@openzeppelin/contracts-0.8/access/Ownable.sol";
import {Address} from "@openzeppelin/contracts-0.8/utils/Address.sol";
import {SafeMathWithRequire} from "../../common/Libraries/SafeMathWithRequire.sol";
import {IERC721} from "@openzeppelin/contracts-0.8/token/ERC721/IERC721.sol";
import {IERC1155} from "@openzeppelin/contracts-0.8/token/ERC1155/IERC1155.sol";

contract ContributionRules is Ownable {
    using Address for address;
    uint256 internal constant DECIMALS_7 = 10000000;
    uint256 internal constant MIDPOINT_9 = 500000000;
    uint256 internal constant NFT_FACTOR_6 = 10000;
    uint256 internal constant NFT_CONSTANT_3 = 9000;
    uint256 internal constant ROOT3_FACTOR = 697;

    struct MultiplierRule {
        uint256[] ids;
        uint256[] multipliers;
        bool balanceOf;
        uint256 index;
    }

    mapping(IERC721 => MultiplierRule) private _listERC721;
    mapping(IERC1155 => MultiplierRule) private _listERC1155;
    IERC721[] internal _listERC721Index;
    IERC1155[] internal _listERC1155Index;

    event ERC1155MultiplierAdded(address indexed contractERC1155, uint256[] multipliers, uint256[] ids);
    event ERC721MultiplierAdded(address indexed contractERC721, uint256[] multipliers, uint256[] ids, bool balanceOf);
    event ERC1155MultiplierDeleted(address indexed contractERC1155);
    event ERC721MultiplierDeleted(address indexed contractERC721);

    function computeMultiplier(address account, uint256 amountStaked) external view returns (uint256) {
        uint256 multiplierERC721 = _multiplierBalanceOfERC721(account);
        uint256 multiplierERC1155 = _multiplierBalanceOfERC1155(account);

        return amountStaked + ((amountStaked * (multiplierERC721 + multiplierERC1155)) / 100);
    }

    function setERC1155MultiplierList(
        address contractERC1155,
        uint256[] memory ids,
        uint256[] memory multipliers
    ) external onlyOwner {
        require(contractERC1155.isContract(), "ContributionRules: invalid contract address");
        require(ids.length > 0, "ContributionRules: invalid ids array");
        require(multipliers.length > 0, "ContributionRules: invalid multiplier array");

        IERC1155 multContract = IERC1155(contractERC1155);

        _listERC1155[multContract].ids = ids;
        _listERC1155[multContract].multipliers = multipliers;
        _listERC1155[multContract].balanceOf = false;

        if (_islistERC1155Member(multContract) == false) {
            _listERC1155Index.push(multContract);
            _listERC1155[multContract].index = _listERC1155Index.length - 1;
        }

        emit ERC1155MultiplierAdded(contractERC1155, multipliers, ids);
    }

    function setERC721MultiplierList(
        address contractERC721,
        uint256[] memory multipliers,
        uint256[] memory ids,
        bool balanceOf
    ) external onlyOwner {
        require(contractERC721.isContract(), "ContributionRules: invalid contract address");

        IERC721 multContract = IERC721(contractERC721);

        _listERC721[multContract].multipliers = multipliers;
        _listERC721[multContract].balanceOf = balanceOf;

        if (ids.length < 0) {
            _listERC721[multContract].ids = ids;
        }

        if (_islistERC721Member(multContract) == false) {
            _listERC721Index.push(multContract);
            _listERC721[multContract].index = _listERC1155Index.length - 1;
        }

        ERC721MultiplierAdded(contractERC721, multipliers, ids, balanceOf);
    }

    function getMultiplierERC721List(address reqContract) external view returns (MultiplierRule memory) {
        require(reqContract.isContract(), "ContributionRules: invalid contract address");
        return _listERC721[IERC721(reqContract)];
    }

    function getMultiplierERC1155List(address reqContract) external view returns (MultiplierRule memory) {
        require(reqContract.isContract(), "ContributionRules: invalid contract address");
        return _listERC1155[IERC1155(reqContract)];
    }

    function deleteMultiplierERC721fromList(IERC721 reqContract) external onlyOwner {
        require(reqContract != IERC721(address(0)), "ContributionRules: invalid contract address");
        require(_islistERC721Member(reqContract), "ContributionRules: contract is not in the list");
        uint256 indexToDelete = _listERC721[reqContract].index;
        IERC721 addrToMove = _listERC721Index[_listERC721Index.length - 1];
        _listERC721Index[indexToDelete] = addrToMove;
        _listERC721[addrToMove].index = indexToDelete;
        _listERC721Index.pop();

        emit ERC721MultiplierDeleted(address(reqContract));
    }

    function deleteMultiplierERC1155fromList(IERC1155 reqContract) external onlyOwner {
        require(reqContract != IERC1155(address(0)), "ContributionRules: invalid contract address");
        require(_islistERC1155Member(reqContract), "ContributionRules: contract is not in the list");
        uint256 indexToDelete = _listERC1155[reqContract].index;
        IERC1155 addrToMove = _listERC1155Index[_listERC1155Index.length - 1];
        _listERC1155Index[indexToDelete] = addrToMove;
        _listERC1155[addrToMove].index = indexToDelete;
        _listERC1155Index.pop();

        emit ERC1155MultiplierDeleted(address(reqContract));
    }

    function _islistERC721Member(IERC721 reqContract) internal view returns (bool) {
        if (_listERC721Index.length == 0) return false;

        return (_listERC721Index[_listERC721[reqContract].index] == reqContract);
    }

    function _islistERC1155Member(IERC1155 reqContract) internal view returns (bool) {
        if (_listERC1155Index.length == 0) return false;

        return (_listERC1155Index[_listERC1155[reqContract].index] == reqContract);
    }

    function _multiplierBalanceOfERC721(address account) internal view returns (uint256) {
        uint256 _multiplier = 0;

        for (uint256 i = 0; i < _listERC721Index.length; i++) {
            IERC721 reqContract = _listERC721Index[i];

            if (_listERC721[reqContract].balanceOf == true) {
                _multiplier = _multiplier + _multiplierLogarithm(account, reqContract);
            }
            if (_listERC721[reqContract].ids.length != 0) {
                for (uint256 j = 0; j < _listERC721[reqContract].ids.length; j++) {
                    address owner = reqContract.ownerOf(_listERC721[reqContract].ids[j]);
                    if (owner == account) {
                        _multiplier = _multiplier + _listERC721[reqContract].multipliers[j];
                    }
                }
            }
        }

        return _multiplier;
    }

    function _multiplierBalanceOfERC1155(address account) internal view returns (uint256) {
        uint256 _multiplier = 0;
        for (uint256 i = 0; i < _listERC1155Index.length; i++) {
            IERC1155 reqContract = _listERC1155Index[i];

            for (uint256 j = 0; j < _listERC1155[reqContract].ids.length; j++) {
                uint256 _bal = reqContract.balanceOf(account, _listERC1155[reqContract].ids[j]);

                if (_bal > 0) {
                    _multiplier = _multiplier + _listERC1155[reqContract].multipliers[j];
                }
            }
        }

        return _multiplier;
    }

    function _multiplierLogarithm(address account, IERC721 contractERC721) internal view returns (uint256) {
        uint256 numLands = contractERC721.balanceOf(account);

        if (numLands == 0) {
            return 0;
        }

        uint256 _landMultiplier =
            NFT_FACTOR_6 * (NFT_CONSTANT_3 + SafeMathWithRequire.cbrt3((((numLands - 1) * ROOT3_FACTOR) + 1)));
        if (_landMultiplier > MIDPOINT_9) {
            _landMultiplier = MIDPOINT_9 + (_landMultiplier - MIDPOINT_9) / 10;
        }

        return _landMultiplier / DECIMALS_7;
    }
}
