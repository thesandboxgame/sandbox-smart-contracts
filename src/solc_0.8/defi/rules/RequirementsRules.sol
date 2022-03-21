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

    struct RequirementRule {
        uint256[] ids;
        uint256 maxAmount;
        uint256 reqAmount;
        uint256 index;
    }

    mapping(IERC721 => RequirementRule) public _listERC721;
    mapping(IERC1155 => RequirementRule) public _listERC1155;
    IERC721[] internal _listERC721Index;
    IERC1155[] internal _listERC1155Index;

    modifier checkRequirements(
        address account,
        uint256 amount,
        uint256 balanceOf
    ) {
        uint256 maxAllowed = _returnMaxStakeAllowed(account);

        // check if amount + current staked balance don't exceed maxAllowed
        require(amount + balanceOf <= maxAllowed, "RequirementsRules: maxAllowed");

        _;
    }

    // if user has not erc721 or erc1155
    function setMaxStakeOverall(uint256 newMaxStake) external onlyOwner {
        maxStakeOverall = newMaxStake;
    }

    function getMaxStakeAllowed(address account) external view returns (uint256) {
        require(account != address(0), "RequirementsRules: invalid address");

        return _returnMaxStakeAllowed(account);
    }

    function addERC721ListRequirement(
        address reqContract,
        uint256 reqAmount,
        uint256[] memory ids,
        uint256 maxAmount
    ) external onlyOwner {
        require(reqContract != address(0), "RequirementsRules: invalid address");
        require(maxAmount > 0, "RequirementsRules: invalid maxAmount");
        require(reqAmount > 0, "RequirementsRules: invalid reqAmount");

        IERC721 newContract = IERC721(reqContract);

        if (ids.length != 0) {
            _listERC721[newContract].ids = ids;
        }
        _listERC721[newContract].maxAmount = maxAmount;
        _listERC721[newContract].reqAmount = reqAmount;

        if (_islistERC721Member(newContract) == false) {
            _listERC721Index.push(newContract);
            _listERC721[newContract].index = _listERC721Index.length - 1;
        }
    }

    function addERC1155ListRequirement(
        address reqContract,
        uint40 reqAmount,
        uint256[] memory ids,
        uint256 maxAmount
    ) external onlyOwner {
        require(reqContract != address(0), "RequirementsRules: invalid address");
        require(maxAmount > 0, "RequirementsRules: invalid maxAmount");
        require(reqAmount > 0, "RequirementsRules: invalid reqAmount");

        IERC1155 newContract = IERC1155(reqContract);
        _listERC1155[newContract].ids = ids;
        _listERC1155[newContract].maxAmount = maxAmount;
        _listERC1155[newContract].reqAmount = reqAmount;

        if (_islistERC1155Member(newContract) == false) {
            _listERC1155Index.push(newContract);
            _listERC1155[newContract].index = _listERC1155Index.length - 1;
        }
    }

    function getERC721ListRequirement(address reqContract) external view returns (RequirementRule memory) {
        require(reqContract != address(0), "RequirementsRules: invalid address");
        return _listERC721[IERC721(reqContract)];
    }

    function getERC1155ListRequirement(address reqContract) external view returns (RequirementRule memory) {
        require(reqContract != address(0), "RequirementsRules: invalid address");
        return _listERC1155[IERC1155(reqContract)];
    }

    function deleteERC721fromListRequirement(IERC721 reqContract) external onlyOwner {
        require(reqContract != IERC721(address(0)), "RequirementsRules: invalid address");
        require(_islistERC721Member(reqContract), "RequirementsRules: contract is not in the list");
        uint256 indexToDelete = _listERC721[reqContract].index;
        IERC721 addrToMove = _listERC721Index[_listERC721Index.length - 1];
        _listERC721Index[indexToDelete] = addrToMove;
        _listERC721[addrToMove].index = indexToDelete;
        _listERC721Index.pop();
    }

    function deldeteERC1155fromListRequirement(IERC1155 reqContract) external onlyOwner {
        require(reqContract != IERC1155(address(0)), "RequirementsRules: invalid address");
        require(_islistERC1155Member(reqContract), "RequirementsRules: contract is not in the list");
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

    function _checkERC721List(address account) internal view returns (uint256) {
        uint256 _totalBal = 0;
        uint256 _maxStake = 0;

        for (uint256 i = 0; i < _listERC721Index.length; i++) {
            IERC721 reqContract = _listERC721Index[i];

            if (_listERC721[reqContract].ids.length == 0) {
                uint256 bal = reqContract.balanceOf(account);
                _totalBal = _totalBal + bal;
            } else {
                for (uint256 j = 0; j < _listERC721[reqContract].ids.length; j++) {
                    address owner = reqContract.ownerOf(_listERC721[reqContract].ids[j]);
                    if (owner == account) {
                        ++_totalBal;
                    }
                }
            }

            if (_totalBal < _listERC721[reqContract].reqAmount) {
                _totalBal = 0;
            }

            _maxStake = _totalBal * _listERC721[reqContract].maxAmount;
        }

        return _maxStake;
    }

    function _checkERC1155List(address account) internal view returns (uint256) {
        uint256 _totalBal = 0;
        uint256 _maxStake = 0;

        for (uint256 i = 0; i < _listERC1155Index.length; i++) {
            IERC1155 reqContract = _listERC1155Index[i];

            for (uint256 j = 0; j < _listERC1155[reqContract].ids.length; j++) {
                uint256 bal = reqContract.balanceOf(account, _listERC1155[reqContract].ids[j]);

                _totalBal = _totalBal + bal;
            }

            if (_totalBal < _listERC1155[reqContract].reqAmount) {
                _totalBal = 0;
            }

            _maxStake = _totalBal * _listERC1155[reqContract].maxAmount;
        }

        return _maxStake;
    }

    function _returnMaxStakeAllowed(address account) internal view returns (uint256) {
        uint256 maxAllowed = 0;
        uint256 maxStakeERC721 = _checkERC721List(account);
        uint256 maxStakeERC11155 = _checkERC1155List(account);

        maxAllowed = Math.min(maxStakeERC721, maxStakeERC11155);

        maxAllowed = Math.min(maxAllowed, maxStakeOverall);

        return maxAllowed;
    }
}
