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

    struct MultiplierERC721 {
        uint256[] ids;
        uint256[] multiplier;
        uint256 index;
        bool balanceOf;
    }

    struct MultiplierERC1155 {
        IERC1155 assetContract;
        uint256[] ids;
        uint256[] multiplier;
        uint256 index;
    }

    mapping(IERC721 => MultiplierERC721) private _listERC721;
    mapping(IERC1155 => MultiplierERC1155) private _listERC1155;
    IERC721[] internal _listERC721Index;
    IERC1155[] internal _listERC1155Index;

    IERC721 public landMultiplierContract;

    constructor(IERC721 _landMultiplierContract) {
        landMultiplierContract = _landMultiplierContract;
    }

    function computeMultiplier(address account, uint256 amountStaked) external view returns (uint256) {
        uint256 nftMultiplier = _multiplierBalanceOfERC721(account);
        uint256 assetMultiplier = _multiplierBalanceOfERC1155(account);
        uint256 landMultiplier = _multiplierBalanceOfLand(account);

        return amountStaked + ((amountStaked * (nftMultiplier + assetMultiplier + landMultiplier)) / 100);
    }

    function setLandMultiplierContract(address newLandContract) external onlyOwner {
        require(newLandContract.isContract(), "ContributionRules: invalid contract address");
        landMultiplierContract = IERC721(newLandContract);
    }

    function addERC1155MultiplierList(
        address contractERC1155,
        uint256[] memory ids,
        uint256[] memory multiplier
    ) external onlyOwner {
        require(contractERC1155.isContract(), "ContributionRules: invalid contract address");
        require(ids.length > 0, "ContributionRules: invalid ids array");
        require(multiplier.length > 0, "ContributionRules: invalid multiplier array");

        IERC1155 multContract = IERC1155(contractERC1155);

        _listERC1155[multContract].ids = ids;
        _listERC1155[multContract].multiplier = multiplier;

        if (_islistERC1155Member(multContract) == false) {
            _listERC1155Index.push(multContract);
            _listERC1155[multContract].index = _listERC1155Index.length - 1;
        }
    }

    function addERC721MultiplierList(
        address contractERC721,
        bool balanceOf,
        uint256[] memory ids
    ) external onlyOwner {
        require(contractERC721.isContract(), "ContributionRules: invalid contract address");
        require(
            (balanceOf == true && ids.length == 0) || (balanceOf == false && ids.length > 0),
            "ContributionRules: invalid ids array"
        );

        IERC721 multContract = IERC721(contractERC721);

        if (balanceOf == false) {
            _listERC721[multContract].ids = ids;
        }

        if (_islistERC721Member(multContract) == false) {
            _listERC721Index.push(multContract);
            _listERC721[multContract].index = _listERC1155Index.length - 1;
        }
    }

    function getMultiplierERC721List(address reqContract) external view returns (MultiplierERC721 memory) {
        require(reqContract.isContract(), "ContributionRules: invalid contract address");
        return _listERC721[IERC721(reqContract)];
    }

    function getMultiplierERC1155List(address reqContract) external view returns (MultiplierERC1155 memory) {
        require(reqContract.isContract(), "ContributionRules: invalid contract address");
        return _listERC1155[IERC1155(reqContract)];
    }

    function delMultiplierERC721fromList(IERC721 reqContract) external onlyOwner {
        require(reqContract != IERC721(address(0)), "ContributionRules: invalid contract address");
        require(_islistERC721Member(reqContract), "ContributionRules: contract is not in the list");
        uint256 indexToDelete = _listERC721[reqContract].index;
        IERC721 addrToMove = _listERC721Index[_listERC721Index.length - 1];
        _listERC721Index[indexToDelete] = addrToMove;
        _listERC721[addrToMove].index = indexToDelete;
        _listERC721Index.pop();
    }

    function delMultiplierERC1155fromList(IERC1155 reqContract) external onlyOwner {
        require(reqContract != IERC1155(address(0)), "ContributionRules: invalid contract address");
        require(_islistERC1155Member(reqContract), "ContributionRules: contract is not in the list");
        uint256 indexToDelete = _listERC1155[reqContract].index;
        IERC1155 addrToMove = _listERC1155Index[_listERC1155Index.length - 1];
        _listERC1155Index[indexToDelete] = addrToMove;
        _listERC1155[addrToMove].index = indexToDelete;
        _listERC1155Index.pop();
    }

    function _islistERC721Member(IERC721 reqContract) internal view returns (bool) {
        if (_listERC721Index.length == 0) return false;
        return (_listERC721Index[_listERC721[reqContract].index] == reqContract);
    }

    function _islistERC1155Member(IERC1155 reqContract) internal view returns (bool) {
        if (_listERC721Index.length == 0) return false;
        return (_listERC1155Index[_listERC1155[reqContract].index] == reqContract);
    }

    function _multiplierBalanceOfLand(address account) internal view returns (uint256) {
        uint256 numLands = landMultiplierContract.balanceOf(account);

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

    function _multiplierBalanceOfERC721(address account) internal view returns (uint256) {
        uint256 _multiplier = 0;
        uint256 _bal = 0;

        for (uint256 i = 0; i < _listERC721Index.length; i++) {
            IERC721 reqContract = _listERC721Index[i];

            if (_listERC721[reqContract].balanceOf == true) {
                _bal = reqContract.balanceOf(account);
                _multiplier = _multiplier + (_bal * _listERC721[reqContract].multiplier[i]);
            } else {
                for (uint256 j = 0; j < _listERC721[reqContract].ids.length; j++) {
                    address owner = reqContract.ownerOf(_listERC721[reqContract].ids[j]);
                    if (owner == account) {
                        ++_bal;
                    }
                    _multiplier = _multiplier + (_bal * _listERC721[reqContract].multiplier[j]);
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

                _multiplier = _multiplier + (_bal * _listERC1155[reqContract].multiplier[j]);
            }
        }

        return _multiplier;
    }
}
