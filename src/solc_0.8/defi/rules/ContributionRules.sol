//SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import {Ownable} from "@openzeppelin/contracts-0.8/access/Ownable.sol";
import {Address} from "@openzeppelin/contracts-0.8/utils/Address.sol";
import {SafeMathWithRequire} from "../../common/Libraries/SafeMathWithRequire.sol";
import {IERC721} from "@openzeppelin/contracts-0.8/token/ERC721/IERC721.sol";
import {IERC1155} from "@openzeppelin/contracts-0.8/token/ERC1155/IERC1155.sol";
import {IContributionRules} from "../interfaces/IContributionRules.sol";

contract ContributionRules is Ownable, IContributionRules {
    using Address for address;

    // LIMITS
    // we limited the number of Ids and contracts that we can have in the lists
    // to avoid the risk of DoS caused by gas limits being exceeded during the iterations
    uint256 public constant idsLimit = 64;
    uint256 public constant contractsLimit = 4;
    uint256 public constant maxMultiplier = 1000;
    uint256 public multiplierLimitERC721 = 1000;
    uint256 public multiplierLimitERC1155 = 1000;

    uint256 internal constant DECIMALS_7 = 10_000_000;
    uint256 internal constant MIDPOINT_9 = 500_000_000;
    uint256 internal constant NFT_FACTOR_6 = 10000;
    uint256 internal constant NFT_CONSTANT_3 = 9000;
    uint256 internal constant ROOT3_FACTOR = 697;

    struct MultiplierRule {
        uint256[] ids;
        uint256[] multipliers;
        bool balanceOf;
        uint256 index;
    }

    mapping(IERC721 => MultiplierRule) internal _listERC721;
    mapping(IERC1155 => MultiplierRule) internal _listERC1155;
    IERC721[] internal _listERC721Index;
    IERC1155[] internal _listERC1155Index;

    event ERC1155MultiplierListSet(address indexed contractERC1155, uint256[] multipliers, uint256[] ids);
    event ERC721MultiplierListSet(address indexed contractERC721, uint256[] multipliers, uint256[] ids, bool balanceOf);
    event ERC1155MultiplierListDeleted(address indexed contractERC1155);
    event ERC721MultiplierListDeleted(address indexed contractERC721);
    event ERC721MultiplierLimitSet(uint256 newERC721MultiplierLimit);
    event ERC1155MultiplierLimitSet(uint256 newERC1155MultiplierLimit);

    modifier isContract(address account) {
        require(account.isContract(), "ContributionRules: is not contract");

        _;
    }

    modifier isERC721MemberList(address contractERC721) {
        require(
            isERC721MemberMultiplierList(IERC721(contractERC721)),
            "ContributionRules: contract is not in the list"
        );
        _;
    }

    modifier isERC1155MemberList(address contractERC1155) {
        require(
            isERC1155MemberMultiplierList(IERC1155(contractERC1155)),
            "ContributionRules: contract is not in the list"
        );
        _;
    }

    function computeMultiplier(address account, uint256 amountStaked) external view override returns (uint256) {
        uint256 multiplierERC721 = multiplierBalanceOfERC721(account);
        uint256 multiplierERC1155 = multiplierBalanceOfERC1155(account);

        // check if the calculated multipliers exceeds the limit
        if (multiplierLimitERC721 < multiplierERC721) {
            multiplierERC721 = multiplierLimitERC721;
        }

        if (multiplierLimitERC1155 < multiplierERC1155) {
            multiplierERC1155 = multiplierLimitERC1155;
        }

        return amountStaked + ((amountStaked * (multiplierERC721 + multiplierERC1155)) / 100);
    }

    function setERC721MultiplierLimit(uint256 _newLimit) external onlyOwner {
        require(_newLimit <= maxMultiplier, "ContributionRules: invalid newLimit");

        multiplierLimitERC721 = _newLimit;

        emit ERC721MultiplierLimitSet(_newLimit);
    }

    function setERC1155MultiplierLimit(uint256 _newLimit) external onlyOwner {
        require(_newLimit <= maxMultiplier, "ContributionRules: invalid newLimit");

        multiplierLimitERC1155 = _newLimit;

        emit ERC1155MultiplierLimitSet(_newLimit);
    }

    function setERC1155MultiplierList(
        address contractERC1155,
        uint256[] memory ids,
        uint256[] memory multipliers
    ) external onlyOwner isContract(contractERC1155) {
        require(ids.length > 0 && ids.length <= idsLimit, "ContributionRules: invalid array of ids");
        require(multipliers.length > 0, "ContributionRules: invalid array of multipliers");

        IERC1155 multContract = IERC1155(contractERC1155);

        // if it's a new member create a new registry, instead, only update
        if (isERC1155MemberMultiplierList(multContract) == false) {
            // Limiting the size of the array (interations) to avoid the risk of DoS.
            require(contractsLimit > _listERC1155Index.length, "ContributionRules: contractsLimit exceeded");
            _listERC1155Index.push(multContract);
            _listERC1155[multContract].index = _listERC1155Index.length - 1;
        }

        _listERC1155[multContract].ids = ids;
        _listERC1155[multContract].multipliers = multipliers;
        _listERC1155[multContract].balanceOf = false;

        emit ERC1155MultiplierListSet(contractERC1155, multipliers, ids);
    }

    function setERC721MultiplierList(
        address contractERC721,
        uint256[] memory ids,
        uint256[] memory multipliers,
        bool balanceOf
    ) external onlyOwner isContract(contractERC721) {
        require(
            balanceOf == true || (ids.length > 0 && multipliers.length == ids.length),
            "ContributionRules: invalid list"
        );
        require(ids.length <= idsLimit, "ContributionRules: invalid array of ids");

        IERC721 multContract = IERC721(contractERC721);

        // if it's a new member create a new registry, instead, only update
        if (isERC721MemberMultiplierList(multContract) == false) {
            // Limiting the size of the array (interations) to avoid the risk of DoS.
            require(contractsLimit > _listERC721Index.length, "ContributionRules: contractsLimit exceeded");
            _listERC721Index.push(multContract);
            _listERC721[multContract].index = _listERC721Index.length - 1;
        }

        _listERC721[multContract].multipliers = multipliers;
        _listERC721[multContract].balanceOf = balanceOf;
        _listERC721[multContract].ids = ids;

        emit ERC721MultiplierListSet(contractERC721, multipliers, ids, balanceOf);
    }

    function getMaxGlobalMultiplier(address account) external view returns (uint256) {
        return multiplierBalanceOfERC721(account) + multiplierBalanceOfERC1155(account);
    }

    function getERC721MultiplierList(address reqContract)
        external
        view
        isContract(reqContract)
        isERC721MemberList(reqContract)
        returns (MultiplierRule memory)
    {
        return _listERC721[IERC721(reqContract)];
    }

    function getERC1155MultiplierList(address reqContract)
        external
        view
        isContract(reqContract)
        isERC1155MemberList(reqContract)
        returns (MultiplierRule memory)
    {
        return _listERC1155[IERC1155(reqContract)];
    }

    function deleteERC721MultiplierList(address contractERC721)
        external
        isContract(contractERC721)
        isERC721MemberList(contractERC721)
        onlyOwner
    {
        IERC721 reqContract = IERC721(contractERC721);
        uint256 indexToDelete = _listERC721[reqContract].index;
        IERC721 addrToMove = _listERC721Index[_listERC721Index.length - 1];
        _listERC721Index[indexToDelete] = addrToMove;
        _listERC721[addrToMove].index = indexToDelete;
        _listERC721Index.pop();

        emit ERC721MultiplierListDeleted(address(reqContract));
    }

    function deleteERC1155MultiplierList(address contractERC1155)
        external
        isContract(contractERC1155)
        isERC1155MemberList(contractERC1155)
        onlyOwner
    {
        IERC1155 reqContract = IERC1155(contractERC1155);
        uint256 indexToDelete = _listERC1155[reqContract].index;
        IERC1155 addrToMove = _listERC1155Index[_listERC1155Index.length - 1];
        _listERC1155Index[indexToDelete] = addrToMove;
        _listERC1155[addrToMove].index = indexToDelete;
        _listERC1155Index.pop();

        emit ERC1155MultiplierListDeleted(address(reqContract));
    }

    function isERC721MemberMultiplierList(IERC721 reqContract) public view returns (bool) {
        return !(_listERC721Index.length == 0) && (_listERC721Index[_listERC721[reqContract].index] == reqContract);
    }

    function isERC1155MemberMultiplierList(IERC1155 reqContract) public view returns (bool) {
        return !(_listERC1155Index.length == 0) && (_listERC1155Index[_listERC1155[reqContract].index] == reqContract);
    }

    function multiplierBalanceOfERC721(address account) public view returns (uint256) {
        uint256 _multiplier = 0;

        for (uint256 i = 0; i < _listERC721Index.length; i++) {
            IERC721 reqContract = _listERC721Index[i];

            if (_listERC721[reqContract].balanceOf == true) {
                _multiplier = _multiplier + multiplierLogarithm(account, reqContract);
            } else {
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

    function multiplierBalanceOfERC1155(address account) public view returns (uint256) {
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

    function multiplierLogarithm(address account, IERC721 contractERC721) public view returns (uint256) {
        uint256 balERC721 = contractERC721.balanceOf(account);

        if (balERC721 == 0) {
            return 0;
        }

        uint256 _multiplierERC721 =
            NFT_FACTOR_6 * (NFT_CONSTANT_3 + SafeMathWithRequire.cbrt3((((balERC721 - 1) * ROOT3_FACTOR) + 1)));
        if (_multiplierERC721 > MIDPOINT_9) {
            _multiplierERC721 = MIDPOINT_9 + (_multiplierERC721 - MIDPOINT_9) / 10;
        }

        return _multiplierERC721 / DECIMALS_7;
    }

    function renounceOwnership() public view override onlyOwner {
        revert("ContributionRules: can't renounceOwnership");
    }
}
