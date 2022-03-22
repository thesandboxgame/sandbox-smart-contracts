//SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import {Ownable} from "@openzeppelin/contracts-0.8/access/Ownable.sol";
import {Address} from "@openzeppelin/contracts-0.8/utils/Address.sol";
import {Math} from "@openzeppelin/contracts-0.8/utils/math/Math.sol";
import {IERC721} from "@openzeppelin/contracts-0.8/token/ERC721/IERC721.sol";
import {IERC1155} from "@openzeppelin/contracts-0.8/token/ERC1155/IERC1155.sol";

contract RequirementsRules is Ownable {
    using Address for address;

    // masStake amount allowed if user has no ERC721 or ERC1155
    uint256 public maxStakeOverall;

    struct RequirementRuleERC721 {
        uint256[] ids;
        bool balanceOf;
        uint256 reqAmountBalanceOf;
        uint256 maxAmountBalanceOf;
        uint256 reqAmountId;
        uint256 maxAmountId;
        uint256 index;
    }

    struct RequirementRuleERC1155 {
        uint256[] ids;
        uint256 reqAmountId;
        uint256 maxAmountId;
        uint256 index;
    }

    mapping(IERC721 => RequirementRuleERC721) public _listERC721;
    mapping(IERC1155 => RequirementRuleERC1155) public _listERC1155;
    IERC721[] internal _listERC721Index;
    IERC1155[] internal _listERC1155Index;

    event ERC1155RequirementAdded(
        address indexed contractERC1155,
        uint256[] ids,
        uint256 reqAmountId,
        uint256 maxAmountId
    );
    event ERC721RequirementAdded(
        address indexed contractERC721,
        uint256[] ids,
        bool balanceOf,
        uint256 reqAmountBalanceOf,
        uint256 maxAmountBalanceOf,
        uint256 reqAmountId,
        uint256 maxAmountId
    );
    event MaxStakeOverallSet(uint256 newMaxStake, uint256 oldMaxStake);
    event ERC1155RequirementDeleted(address indexed contractERC1155);
    event ERC721RequirementDeleted(address indexed contractERC721);

    modifier checkRequirements(
        address account,
        uint256 amount,
        uint256 balanceOf
    ) {
        uint256 maxAllowed = _returnMaxStakeAllowed(account);

        if (maxAllowed != 0) {
            require(amount + balanceOf <= maxAllowed, "RequirementsRules: maxAllowed");
        }

        _;
    }

    // if user has not erc721 or erc1155
    function setMaxStakeOverall(uint256 newMaxStake) external onlyOwner {
        uint256 oldMaxStake = maxStakeOverall;
        maxStakeOverall = newMaxStake;

        emit MaxStakeOverallSet(newMaxStake, oldMaxStake);
    }

    function getMaxStakeAllowed(address account) external view returns (uint256) {
        require(account != address(0), "RequirementsRules: invalid address");

        return _returnMaxStakeAllowed(account);
    }

    function setERC721ListRequirement(
        address contractERC721,
        uint256[] memory ids,
        bool balanceOf,
        uint256 reqAmountBalanceOf,
        uint256 maxAmountBalanceOf,
        uint256 reqAmountId,
        uint256 maxAmountId
    ) external onlyOwner {
        require(contractERC721 != address(0), "RequirementsRules: invalid address");

        IERC721 newContract = IERC721(contractERC721);

        if (ids.length != 0) {
            _listERC721[newContract].ids = ids;
        }
        _listERC721[newContract].reqAmountBalanceOf = reqAmountBalanceOf;
        _listERC721[newContract].maxAmountBalanceOf = maxAmountBalanceOf;
        _listERC721[newContract].reqAmountId = reqAmountId;
        _listERC721[newContract].maxAmountId = maxAmountId;
        _listERC721[newContract].balanceOf = balanceOf;

        // if it's a new member create a new register, instead, only update
        if (_islistERC721Member(newContract) == false) {
            _listERC721Index.push(newContract);
            _listERC721[newContract].index = _listERC721Index.length - 1;
        }

        emit ERC721RequirementAdded(
            contractERC721,
            ids,
            balanceOf,
            reqAmountBalanceOf,
            maxAmountBalanceOf,
            reqAmountId,
            maxAmountId
        );
    }

    function setERC1155ListRequirement(
        address contractERC1155,
        uint256[] memory ids,
        uint256 reqAmountId,
        uint256 maxAmountId
    ) external onlyOwner {
        require(contractERC1155 != address(0), "RequirementsRules: invalid address");

        IERC1155 newContract = IERC1155(contractERC1155);
        _listERC1155[newContract].ids = ids;
        _listERC1155[newContract].reqAmountId = reqAmountId;
        _listERC1155[newContract].maxAmountId = maxAmountId;

        if (_islistERC1155Member(newContract) == false) {
            _listERC1155Index.push(newContract);
            _listERC1155[newContract].index = _listERC1155Index.length - 1;
        }

        emit ERC1155RequirementAdded(contractERC1155, ids, reqAmountId, maxAmountId);
    }

    function getERC721ListRequirement(address contractERC721) external view returns (RequirementRuleERC721 memory) {
        require(contractERC721 != address(0), "RequirementsRules: invalid address");
        return _listERC721[IERC721(contractERC721)];
    }

    function getERC1155ListRequirement(address contractERC1155) external view returns (RequirementRuleERC1155 memory) {
        require(contractERC1155 != address(0), "RequirementsRules: invalid address");
        return _listERC1155[IERC1155(contractERC1155)];
    }

    function deleteERC721fromListRequirement(IERC721 contractERC721) external onlyOwner {
        require(contractERC721 != IERC721(address(0)), "RequirementsRules: invalid address");
        require(_islistERC721Member(contractERC721), "RequirementsRules: contract is not in the list");
        uint256 indexToDelete = _listERC721[contractERC721].index;
        IERC721 addrToMove = _listERC721Index[_listERC721Index.length - 1];
        _listERC721Index[indexToDelete] = addrToMove;
        _listERC721[addrToMove].index = indexToDelete;
        _listERC721Index.pop();

        emit ERC721RequirementDeleted(address(contractERC721));
    }

    function deleteERC1155fromListRequirement(IERC1155 contractERC1155) external onlyOwner {
        require(contractERC1155 != IERC1155(address(0)), "RequirementsRules: invalid address");
        require(_islistERC1155Member(contractERC1155), "RequirementsRules: contract is not in the list");
        uint256 indexToDelete = _listERC1155[contractERC1155].index;
        IERC1155 addrToMove = _listERC1155Index[_listERC1155Index.length - 1];
        _listERC1155Index[indexToDelete] = addrToMove;
        _listERC1155[addrToMove].index = indexToDelete;
        _listERC1155Index.pop();

        emit ERC1155RequirementDeleted(address(contractERC1155));
    }

    function _islistERC721Member(IERC721 reqContract) internal view returns (bool) {
        if (_listERC721Index.length == 0) return false;

        return (_listERC721Index[_listERC721[reqContract].index] == reqContract);
    }

    function _islistERC1155Member(IERC1155 reqContract) internal view returns (bool) {
        if (_listERC1155Index.length == 0) return false;

        return (_listERC1155Index[_listERC1155[reqContract].index] == reqContract);
    }

    function _checkERC721Requirements(address account) internal view returns (uint256) {
        uint256 _maxStake = 0;
        for (uint256 i = 0; i < _listERC721Index.length; i++) {
            uint256 balanceOf = 0;
            uint256 balanceOfId = 0;
            IERC721 reqContract = _listERC721Index[i];

            if (_listERC721[reqContract].balanceOf == true) {
                balanceOf = reqContract.balanceOf(account);
            }

            for (uint256 j = 0; j < _listERC721[reqContract].ids.length; j++) {
                address owner = reqContract.ownerOf(_listERC721[reqContract].ids[j]);
                if (owner == account) {
                    ++balanceOfId;
                }
            }

            if (balanceOf < _listERC721[reqContract].reqAmountBalanceOf) {
                balanceOf = 0;
            }

            if (balanceOfId < _listERC721[reqContract].reqAmountId) {
                balanceOfId = 0;
            }

            _maxStake =
                _maxStake +
                (balanceOf *
                    _listERC721[reqContract].maxAmountBalanceOf +
                    balanceOfId *
                    _listERC721[reqContract].maxAmountId);
        }

        return _maxStake;
    }

    function _checkERC1155Requirements(address account) internal view returns (uint256) {
        uint256 _totalBal = 0;
        uint256 _maxStake = 0;

        for (uint256 i = 0; i < _listERC1155Index.length; i++) {
            IERC1155 reqContract = _listERC1155Index[i];

            for (uint256 j = 0; j < _listERC1155[reqContract].ids.length; j++) {
                uint256 bal = reqContract.balanceOf(account, _listERC1155[reqContract].ids[j]);

                _totalBal = _totalBal + bal;
            }

            if (_totalBal < _listERC1155[reqContract].reqAmountId) {
                _totalBal = 0;
            }

            _maxStake = _totalBal * _listERC1155[reqContract].maxAmountId;
        }

        return _maxStake;
    }

    function _returnMaxStakeAllowed(address account) internal view returns (uint256) {
        uint256 maxAllowed = 0;
        uint256 maxStakeERC721 = _checkERC721Requirements(account);
        uint256 maxStakeERC1155 = _checkERC1155Requirements(account);

        maxAllowed = Math.min(maxAllowed, maxStakeERC721 + maxStakeERC1155);

        return maxAllowed;
    }
}
