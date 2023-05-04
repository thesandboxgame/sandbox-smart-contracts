//SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import {Ownable} from "@openzeppelin/contracts-0.8/access/Ownable.sol";
import {Address} from "@openzeppelin/contracts-0.8/utils/Address.sol";
import {Math} from "@openzeppelin/contracts-0.8/utils/math/Math.sol";
import {IERC721} from "@openzeppelin/contracts-0.8/token/ERC721/IERC721.sol";
import {IERC1155} from "@openzeppelin/contracts-0.8/token/ERC1155/IERC1155.sol";

/// @notice The base contract (ERC20RewardPool) inherits from this one. This contract contains
/// and checks all the requirements that a user needs to meet in order to stake.
/// These requirements are checked through the modifier checkRequirements at the moment of the stake
contract RequirementsRulesV2 is Ownable {
    using Address for address;

    // we limited the number of Ids and contracts that we can have in the lists
    // to avoid the risk of DoS caused by gas limits being exceeded during the iterations
    uint256 public constant IDS_LIMIT = 64;
    uint256 public constant CONTRACTS_LIMIT = 4;

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

    event ERC1155RequirementListSet(
        address indexed contractERC1155,
        uint256[] ids,
        uint256 minAmountId,
        uint256 maxAmountId
    );
    event ERC721RequirementListSet(
        address indexed contractERC721,
        uint256[] ids,
        bool balanceOf,
        uint256 minAmountBalanceOf,
        uint256 maxAmountBalanceOf,
        uint256 minAmountId,
        uint256 maxAmountId
    );
    event MaxStakeOverallSet(uint256 newMaxStake, uint256 oldMaxStake);
    event ERC11551RequirementListDeleted(address indexed contractERC1155);
    event ERC721RequirementListDeleted(address indexed contractERC721);

    modifier isContract(address account) {
        require(account.isContract(), "RequirementsRules: is not a contract");

        _;
    }

    modifier checkRequirements(
        address account,
        uint256 amount,
        uint256 balanceOf
    ) {
        uint256 maxStakeERC721 = checkAndGetERC721Stake(account);
        uint256 maxStakeERC1155 = checkAndGetERC1155Stake(account);
        uint256 maxAllowed = _maxStakeAllowedCalculator(maxStakeERC721, maxStakeERC1155);

        if ((maxAllowed > 0) || _listERC721Index.length > 0 || _listERC1155Index.length > 0) {
            require(amount + balanceOf <= maxAllowed, "RequirementsRules: maxAllowed");
        }

        _;
    }

    modifier isERC721MemberList(address contractERC721) {
        require(
            isERC721MemberRequirementList(IERC721(contractERC721)),
            "RequirementsRules: contract is not in the list"
        );
        _;
    }

    modifier isERC1155MemberList(address contractERC1155) {
        require(
            isERC1155MemberRequirementList(IERC1155(contractERC1155)),
            "RequirementsRules: contract is not in the list"
        );
        _;
    }

    /// @notice set a Max stake in case user has not ERC721 or ERC1155
    /// @param newMaxStake new max stake value
    /// @dev we should always try setting this value to less than the lowest amount
    /// @dev possible from meeting a requirement rule.
    /// @dev That way we don't benefit those who do not have assets
    function setMaxStakeOverall(uint256 newMaxStake) external onlyOwner {
        uint256 oldMaxStake = maxStakeOverall;
        maxStakeOverall = newMaxStake;

        emit MaxStakeOverallSet(newMaxStake, oldMaxStake);
    }

    /// @notice set the ERC71 requirements for the user to stake
    /// @param contractERC721 ERC721 contract address to add to the list
    /// @param ids ID user should hold
    /// @param balanceOf if true, use the balanceOf values instead of Ids
    /// @param minAmountBalanceOf min amount user should hold to be able to stake
    /// @param maxAmountBalanceOf max value user can stake for each ERC721 he owns.
    /// @param minAmountId min amount user needs to own of a specific ID to be able to stake
    /// @param maxAmountId max value user can stake for each asset(ID) he owns
    function setERC721RequirementList(
        address contractERC721,
        uint256[] memory ids,
        bool balanceOf,
        uint256 minAmountBalanceOf,
        uint256 maxAmountBalanceOf,
        uint256 minAmountId,
        uint256 maxAmountId
    ) external onlyOwner isContract(contractERC721) {
        if (balanceOf == true) {
            require(ids.length == 0, "RequirementRules: invalid ids array");
            require(minAmountBalanceOf > 0, "RequirementRules: invalid minAmountBalanceOf");
            require(maxAmountBalanceOf > 0, "RequirementRules: invalid maxAmountBalanceOf");
        } else {
            require(ids.length > 0, "RequirementRules: invalid ids array");
            require(minAmountId > 0, "RequirementRules: invalid minAmountId");
            require(maxAmountId > 0, "RequirementRules: invalid maxAmountId");
            require(ids.length <= IDS_LIMIT, "RequirementRules: ids array > limit");
        }

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
        if (isERC721MemberRequirementList(newContract) == false) {
            // Limiting the size of the array (interations) to avoid the risk of DoS.
            require(CONTRACTS_LIMIT > _listERC721Index.length, "RequirementsRules: CONTRACTS_LIMIT exceeded");
            _listERC721Index.push(newContract);
            _listERC721[newContract].index = _listERC721Index.length - 1;
        }

        emit ERC721RequirementListSet(
            contractERC721,
            ids,
            balanceOf,
            minAmountBalanceOf,
            maxAmountBalanceOf,
            minAmountId,
            maxAmountId
        );
    }

    /// @notice set the ERC1155 requirements for the user to stake
    /// @param contractERC1155 ERC1155 contract address to add to the list
    /// @param ids ID user should hold
    /// @param minAmountId min amount user needs to own of a specific ID to be able to stake
    /// @param maxAmountId max value user can stake for each asset(ID) he owns
    function setERC1155RequirementList(
        address contractERC1155,
        uint256[] memory ids,
        uint256 minAmountId,
        uint256 maxAmountId
    ) external onlyOwner isContract(contractERC1155) {
        require(ids.length > 0, "RequirementRules: invalid ids");
        require(minAmountId > 0, "RequirementRules: invalid minAmountId");
        require(maxAmountId > 0, "RequirementRules: invalid");
        require(ids.length <= IDS_LIMIT, "RequirementRules: IDS_LIMIT");
        IERC1155 newContract = IERC1155(contractERC1155);
        _listERC1155[newContract].ids = ids;
        _listERC1155[newContract].minAmountId = minAmountId;
        _listERC1155[newContract].maxAmountId = maxAmountId;

        // if it's a new member create a new registry, instead, only update
        if (isERC1155MemberRequirementList(newContract) == false) {
            // Limiting the size of the array (interations) to avoid the risk of DoS.
            require(CONTRACTS_LIMIT > _listERC1155Index.length, "RequirementsRules: CONTRACTS_LIMIT exceeded");
            _listERC1155Index.push(newContract);
            _listERC1155[newContract].index = _listERC1155Index.length - 1;
        }

        emit ERC1155RequirementListSet(contractERC1155, ids, minAmountId, maxAmountId);
    }

    /// @notice return the ERC721 list of the given contract
    /// @param contractERC721 contract address to retrieve the list
    function getERC721RequirementList(address contractERC721)
        external
        view
        isContract(contractERC721)
        isERC721MemberList(contractERC721)
        returns (ERC721RequirementRule memory)
    {
        return _listERC721[IERC721(contractERC721)];
    }

    /// @notice return the ERC1155 list of the given contract
    /// @param contractERC1155 contract address to retrieve the list
    function getERC1155RequirementList(address contractERC1155)
        external
        view
        isContract(contractERC1155)
        isERC1155MemberList(contractERC1155)
        returns (ERC1155RequirementRule memory)
    {
        return _listERC1155[IERC1155(contractERC1155)];
    }

    /// @notice remove the given contract from the list
    /// @param contractERC721 contract address to be removed from the list
    function deleteERC721RequirementList(address contractERC721)
        external
        onlyOwner
        isContract(contractERC721)
        isERC721MemberList(contractERC721)
    {
        IERC721 reqContract = IERC721(contractERC721);
        uint256 indexToDelete = _listERC721[reqContract].index;
        IERC721 addrToMove = _listERC721Index[_listERC721Index.length - 1];
        _listERC721Index[indexToDelete] = addrToMove;
        _listERC721[addrToMove].index = indexToDelete;
        _listERC721Index.pop();

        emit ERC721RequirementListDeleted(contractERC721);
    }

    /// @notice remove the given contract from the list
    /// @param contractERC1155 contract address to be removed from the list
    function deleteERC1155RequirementList(address contractERC1155)
        external
        onlyOwner
        isContract(contractERC1155)
        isERC1155MemberList(contractERC1155)
    {
        IERC1155 reqContract = IERC1155(contractERC1155);
        uint256 indexToDelete = _listERC1155[reqContract].index;
        IERC1155 addrToMove = _listERC1155Index[_listERC1155Index.length - 1];
        _listERC1155Index[indexToDelete] = addrToMove;
        _listERC1155[addrToMove].index = indexToDelete;
        _listERC1155Index.pop();

        emit ERC11551RequirementListDeleted(contractERC1155);
    }

    /// @notice check if the given contract is in the list
    /// @param reqContract contract address to check
    /// @return true if the contract is in the list
    function isERC721MemberRequirementList(IERC721 reqContract) public view returns (bool) {
        return (_listERC721Index.length != 0) && (_listERC721Index[_listERC721[reqContract].index] == reqContract);
    }

    /// @notice check if the given contract is in the list
    /// @param reqContract contract address to check
    /// @return true if the contract is in the list
    function isERC1155MemberRequirementList(IERC1155 reqContract) public view returns (bool) {
        return (_listERC1155Index.length != 0) && (_listERC1155Index[_listERC1155[reqContract].index] == reqContract);
    }

    /// @notice return the max amount the user can stake for holding ERC721 assets
    /// @param account user address to calculate the max stake amount
    function getERC721MaxStake(address account) public view returns (uint256) {
        uint256 _maxStake;
        uint256 _indexLength = _listERC721Index.length;

        for (uint256 i; i < _indexLength; ) {
            uint256 balanceOf;
            uint256 balanceOfId;
            IERC721 reqContract = _listERC721Index[i];

            if (_listERC721[reqContract].balanceOf == true) {
                balanceOf = reqContract.balanceOf(account);
            } else {
                balanceOfId = getERC721BalanceId(reqContract, account);
            }

            _maxStake =
                _maxStake +
                (balanceOf *
                    _listERC721[reqContract].maxAmountBalanceOf +
                    balanceOfId *
                    _listERC721[reqContract].maxAmountId);

            unchecked {i++;}
        }

        return _maxStake;
    }

    /// @notice return the max amount the user can stake for holding ERC1155 assets
    /// @param account user address to calculate the max stake amount
    function getERC1155MaxStake(address account) public view returns (uint256) {
        uint256 _maxStake;
        uint256 _indexLength = _listERC1155Index.length;

        for (uint256 i; i < _indexLength; ) {
            uint256 _totalBal;
            IERC1155 reqContract = _listERC1155Index[i];

            uint256 bal = getERC1155BalanceId(reqContract, account);

            _totalBal = _totalBal + bal;

            _maxStake = _maxStake + (_totalBal * _listERC1155[reqContract].maxAmountId);

            unchecked {i++;}
        }

        return _maxStake;
    }

    /// @notice return the max amount the user can stake
    /// @param account user address to calculate the max stake amount
    function maxStakeAllowedCalculator(address account) public view returns (uint256) {
        uint256 maxStakeERC721 = getERC721MaxStake(account);
        uint256 maxStakeERC1155 = getERC1155MaxStake(account);
        return _maxStakeAllowedCalculator(maxStakeERC721, maxStakeERC1155);
    }

    /// @notice return the balance of a specific ID the given user owns
    /// @param account user address to check the balance
    function getERC721BalanceId(IERC721 reqContract, address account) public view returns (uint256) {
        uint256 balanceOfId;
        uint256 _listIdsLength = _listERC721[reqContract].ids.length;

        for (uint256 j; j < _listIdsLength; ) {
            address owner = reqContract.ownerOf(_listERC721[reqContract].ids[j]);
            if (owner == account) {
                ++balanceOfId;
            }

            unchecked {j++;}
        }

        return balanceOfId;
    }

    /// @notice return the balance of a specific ID the given user owns
    /// @param account user address to check the balance
    function getERC1155BalanceId(IERC1155 reqContract, address account) public view returns (uint256) {
        uint256 balanceOfId;
        uint256 _listIdsLength = _listERC1155[reqContract].ids.length;

        for (uint256 j; j < _listIdsLength; ) {
            uint256 bal = reqContract.balanceOf(account, _listERC1155[reqContract].ids[j]);

            balanceOfId = balanceOfId + bal;

            unchecked {j++;}
        }

        return balanceOfId;
    }

    /// @notice check and calculates the ERC1155 max stake for the given user
    /// @param account user address to check
    function checkAndGetERC1155Stake(address account) public view returns (uint256) {
        uint256 _maxStake;
        uint256 _indexLength = _listERC1155Index.length;

        for (uint256 i; i < _indexLength; ) {
            IERC1155 reqContract = _listERC1155Index[i];

            uint256 balanceId = getERC1155BalanceId(reqContract, account);
            if (_listERC1155[reqContract].ids.length > 0) {
                require(balanceId >= _listERC1155[reqContract].minAmountId, "RequirementsRules: balanceId");
            }
            _maxStake = _maxStake + (balanceId * _listERC1155[reqContract].maxAmountId);

            unchecked {i++;}
        }
        return _maxStake;
    }

    /// @notice check and calculates the ERC721 max stake for the given user
    /// @param account user address to check
    function checkAndGetERC721Stake(address account) public view returns (uint256) {
        uint256 _maxStake;
        uint256 _indexLength = _listERC721Index.length;

        for (uint256 i; i < _indexLength; ) {
            uint256 balanceOf;
            uint256 balanceOfId;
            IERC721 reqContract = _listERC721Index[i];

            if (_listERC721[reqContract].balanceOf == true) {
                require(
                    (reqContract.balanceOf(account) >= _listERC721[reqContract].minAmountBalanceOf) ||
                        (maxStakeOverall > 0),
                    "RequirementsRules: balanceOf"
                );
                balanceOf = reqContract.balanceOf(account);
            } else {
                balanceOfId = getERC721BalanceId(reqContract, account);
                if (_listERC721[reqContract].ids.length > 0) {
                    require(
                        (balanceOfId >= _listERC721[reqContract].minAmountId) || (maxStakeOverall > 0),
                        "RequirementsRules: balanceId"
                    );
                }
            }

            _maxStake =
                _maxStake +
                (balanceOf *
                    _listERC721[reqContract].maxAmountBalanceOf +
                    balanceOfId *
                    _listERC721[reqContract].maxAmountId);

            unchecked {i++;}
        }
        return _maxStake;
    }

    /// @notice calculates the maxStake allowed
    /// @param maxStakeERC721 max stake ERC721 previously calculated for the user
    /// @param maxStakeERC1155 max stake ERC1155 previously calculated for the user
    /// @return max amount allowed for the user to stake
    function _maxStakeAllowedCalculator(uint256 maxStakeERC721, uint256 maxStakeERC1155)
        internal
        view
        returns (uint256)
    {
        uint256 maxAllowed = maxStakeOverall;

        uint256 totalMaxStake = maxStakeERC721 + maxStakeERC1155;

        if (totalMaxStake > 0) {
            if (maxAllowed > 0) {
                maxAllowed = Math.min(maxAllowed, totalMaxStake);
            } else {
                maxAllowed = totalMaxStake;
            }
        }

        return maxAllowed;
    }
}
