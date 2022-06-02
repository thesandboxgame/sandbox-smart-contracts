//SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import {Ownable} from "@openzeppelin/contracts-0.8/access/Ownable.sol";
import {Address} from "@openzeppelin/contracts-0.8/utils/Address.sol";
import {Math} from "@openzeppelin/contracts-0.8/utils/math/Math.sol";
import {IERC721} from "@openzeppelin/contracts-0.8/token/ERC721/IERC721.sol";
import {IERC1155} from "@openzeppelin/contracts-0.8/token/ERC1155/IERC1155.sol";

contract RequirementsRules is Ownable {
    using Address for address;

    // maxStake amount allowed if user has no ERC721 or ERC1155
    uint256 public maxStakeOverall;

    struct ERC721RequirementRule {
        uint256[] ids;
        bool balanceOf;
        uint256 minAmountBalanceOf;
        uint256 maxAmountBalanceOf;
        uint256 minAmountId;
        uint256 maxAmountId;
        uint256 index;
    }

    struct ERC1155RequirementRule {
        uint256[] ids;
        uint256 minAmountId;
        uint256 maxAmountId;
        uint256 index;
    }

    mapping(IERC721 => ERC721RequirementRule) internal _listERC721;
    mapping(IERC1155 => ERC1155RequirementRule) internal _listERC1155;
    IERC721[] internal _listERC721Index;
    IERC1155[] internal _listERC1155Index;

    event ERC11551ListRequirementSet(
        address indexed contractERC1155,
        uint256[] ids,
        uint256 minAmountId,
        uint256 maxAmountId
    );
    event ERC721ListRequirementSet(
        address indexed contractERC721,
        uint256[] ids,
        bool balanceOf,
        uint256 minAmountBalanceOf,
        uint256 maxAmountBalanceOf,
        uint256 minAmountId,
        uint256 maxAmountId
    );
    event MaxStakeOverallSet(uint256 newMaxStake, uint256 oldMaxStake);
    event ERC1155RequirementDeleted(address indexed contractERC1155);
    event ERC721RequirementDeleted(address indexed contractERC721);

    modifier isContract(address account) {
        require(account.isContract(), "RequirementsRules: is not contract");

        _;
    }

    modifier checkRequirements(
        address account,
        uint256 amount,
        uint256 balanceOf
    ) {
        checkERC1155MinStake(account);
        checkERC721MinStake(account);

        uint256 maxAllowed = maxStakeAllowedCalculator(account);

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

    function setERC721ListRequirement(
        address contractERC721,
        uint256[] memory ids,
        bool balanceOf,
        uint256 minAmountBalanceOf,
        uint256 maxAmountBalanceOf,
        uint256 minAmountId,
        uint256 maxAmountId
    ) external onlyOwner isContract(contractERC721) {
        IERC721 newContract = IERC721(contractERC721);

        if (ids.length != 0) {
            _listERC721[newContract].ids = ids;
        }
        _listERC721[newContract].minAmountBalanceOf = minAmountBalanceOf;
        _listERC721[newContract].maxAmountBalanceOf = maxAmountBalanceOf;
        _listERC721[newContract].minAmountId = minAmountId;
        _listERC721[newContract].maxAmountId = maxAmountId;
        _listERC721[newContract].balanceOf = balanceOf;

        // if it's a new member create a new registry, instead, only update
        if (isERC721ListMember(newContract) == false) {
            _listERC721Index.push(newContract);
            _listERC721[newContract].index = _listERC721Index.length - 1;
        }

        emit ERC721ListRequirementSet(
            contractERC721,
            ids,
            balanceOf,
            minAmountBalanceOf,
            maxAmountBalanceOf,
            minAmountId,
            maxAmountId
        );
    }

    function setERC1155ListRequirement(
        address contractERC1155,
        uint256[] memory ids,
        uint256 minAmountId,
        uint256 maxAmountId
    ) external onlyOwner isContract(contractERC1155) {
        IERC1155 newContract = IERC1155(contractERC1155);
        _listERC1155[newContract].ids = ids;
        _listERC1155[newContract].minAmountId = minAmountId;
        _listERC1155[newContract].maxAmountId = maxAmountId;

        // if it's a new member create a new registry, instead, only update
        if (isERC1155ListMember(newContract) == false) {
            _listERC1155Index.push(newContract);
            _listERC1155[newContract].index = _listERC1155Index.length - 1;
        }

        emit ERC11551ListRequirementSet(contractERC1155, ids, minAmountId, maxAmountId);
    }

    function getERC721ListRequirement(address contractERC721)
        external
        view
        isContract(contractERC721)
        returns (ERC721RequirementRule memory)
    {
        require(isERC721ListMember(IERC721(contractERC721)), "RequirementsRules: contract is not in the list");
        return _listERC721[IERC721(contractERC721)];
    }

    function getERC1155ListRequirement(address contractERC1155)
        external
        view
        isContract(contractERC1155)
        returns (ERC1155RequirementRule memory)
    {
        require(isERC1155ListMember(IERC1155(contractERC1155)), "RequirementsRules: contract is not in the list");
        return _listERC1155[IERC1155(contractERC1155)];
    }

    function deleteERC721ListRequirement(address contractERC721) external onlyOwner isContract(contractERC721) {
        IERC721 reqContract = IERC721(contractERC721);
        require(isERC721ListMember(reqContract), "RequirementsRules: contract is not in the list");
        uint256 indexToDelete = _listERC721[reqContract].index;
        IERC721 addrToMove = _listERC721Index[_listERC721Index.length - 1];
        _listERC721Index[indexToDelete] = addrToMove;
        _listERC721[addrToMove].index = indexToDelete;
        _listERC721Index.pop();

        emit ERC721RequirementDeleted(address(contractERC721));
    }

    function deleteERC1155ListRequirement(address contractERC1155) external onlyOwner isContract(contractERC1155) {
        IERC1155 reqContract = IERC1155(contractERC1155);
        require(isERC1155ListMember(reqContract), "RequirementsRules: contract is not in the list");
        uint256 indexToDelete = _listERC1155[reqContract].index;
        IERC1155 addrToMove = _listERC1155Index[_listERC1155Index.length - 1];
        _listERC1155Index[indexToDelete] = addrToMove;
        _listERC1155[addrToMove].index = indexToDelete;
        _listERC1155Index.pop();

        emit ERC1155RequirementDeleted(contractERC1155);
    }

    function isERC721ListMember(IERC721 reqContract) public view returns (bool) {
        if (_listERC721Index.length == 0) return false;

        return (_listERC721Index[_listERC721[reqContract].index] == reqContract);
    }

    function isERC1155ListMember(IERC1155 reqContract) public view returns (bool) {
        if (_listERC1155Index.length == 0) return false;

        return (_listERC1155Index[_listERC1155[reqContract].index] == reqContract);
    }

    function getERC721MaxStake(address account) public view returns (uint256) {
        uint256 _maxStake = 0;
        for (uint256 i = 0; i < _listERC721Index.length; i++) {
            uint256 balanceOf = 0;
            uint256 balanceOfId = 0;
            IERC721 reqContract = _listERC721Index[i];

            if (_listERC721[reqContract].balanceOf == true) {
                balanceOf = reqContract.balanceOf(account);
            }

            balanceOfId = getERC721BalanceId(reqContract, account);

            _maxStake =
                _maxStake +
                (balanceOf *
                    _listERC721[reqContract].maxAmountBalanceOf +
                    balanceOfId *
                    _listERC721[reqContract].maxAmountId);
        }

        return _maxStake;
    }

    function getERC1155MaxStake(address account) public view returns (uint256) {
        uint256 _maxStake = 0;

        for (uint256 i = 0; i < _listERC1155Index.length; i++) {
            uint256 _totalBal = 0;
            IERC1155 reqContract = _listERC1155Index[i];

            uint256 bal = getERC1155BalanceId(reqContract, account);

            _totalBal = _totalBal + bal;

            _maxStake = _totalBal * _listERC1155[reqContract].maxAmountId;
        }

        return _maxStake;
    }

    function checkERC1155MinStake(address account) public view {
        uint256 balanceId = 0;

        for (uint256 i = 0; i < _listERC1155Index.length; i++) {
            IERC1155 reqContract = _listERC1155Index[i];

            balanceId = getERC1155BalanceId(reqContract, account);

            require(balanceId >= _listERC1155[reqContract].minAmountId, "RequirementsRules: balanceId");
        }
    }

    function checkERC721MinStake(address account) public view {
        for (uint256 i = 0; i < _listERC721Index.length; i++) {
            IERC721 reqContract = _listERC721Index[i];

            if (_listERC721[reqContract].ids.length > 0) {
                require(
                    getERC721BalanceId(reqContract, account) >= _listERC721[reqContract].minAmountId,
                    "RequirementsRules: balanceId"
                );
            }

            if (_listERC721[reqContract].balanceOf == true) {
                require(
                    reqContract.balanceOf(account) >= _listERC721[reqContract].minAmountBalanceOf,
                    "RequirementsRules: balanceOf"
                );
            }
        }
    }

    function maxStakeAllowedCalculator(address account) public view returns (uint256) {
        uint256 maxAllowed = maxStakeOverall;
        uint256 maxStakeERC721 = getERC721MaxStake(account);
        uint256 maxStakeERC1155 = getERC1155MaxStake(account);

        if (maxStakeERC721 + maxStakeERC1155 > 0) {
            if (maxStakeOverall > 0) {
                maxAllowed = Math.min(maxAllowed, maxStakeERC721 + maxStakeERC1155);
            } else {
                maxAllowed = maxStakeERC721 + maxStakeERC1155;
            }
        } else {
            maxAllowed = maxStakeOverall;
        }

        return maxAllowed;
    }

    function getERC721BalanceId(IERC721 reqContract, address account) public view returns (uint256) {
        uint256 balanceOfId = 0;

        for (uint256 j = 0; j < _listERC721[reqContract].ids.length; j++) {
            address owner = reqContract.ownerOf(_listERC721[reqContract].ids[j]);
            if (owner == account) {
                ++balanceOfId;
            }
        }

        return balanceOfId;
    }

    function getERC1155BalanceId(IERC1155 reqContract, address account) public view returns (uint256) {
        uint256 balanceOfId = 0;

        for (uint256 j = 0; j < _listERC1155[reqContract].ids.length; j++) {
            uint256 bal = reqContract.balanceOf(account, _listERC1155[reqContract].ids[j]);

            balanceOfId = balanceOfId + bal;
        }

        return balanceOfId;
    }
}
