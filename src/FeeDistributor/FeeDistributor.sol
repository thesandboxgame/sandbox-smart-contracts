pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import "../common/Libraries/SafeMathWithRequire.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";


/// @title Fee distributor
/// @notice Distributes all fees collected from platform activities to stakeholders
contract FeeDistributor {
    using SafeERC20 for IERC20;
    event Deposit(address token, address from, uint256 amount);
    event Withdrawal(IERC20 token, address to, uint256 amount);
    mapping(address => uint256) public recipientsShares;

    /// @notice Enables fee holder to withdraw its share
    /// @notice Zero address reserved for ether withdrawal
    /// @param token the token that fee should be distributed in
    /// @param beneficiary
    /// @return amount had withdrawn
    function withdraw(IERC20 token, address payable beneficiary) external returns (uint256 amount) {
        if (address(token) == address(0)) {
            amount = _etherWithdrawal(beneficiary);
        } else {
            amount = _tokenWithdrawal(token, beneficiary);
        }
        if (amount != 0) {
            emit Withdrawal(token, msg.sender, amount);
        }
    }

    receive() external payable {
        emit Deposit(address(0), msg.sender, msg.value);
    }

    // //////////////////// INTERNALS ////////////////////
    function _etherWithdrawal(address payable beneficiary) private returns (uint256) {
        uint256 amount = _calculateWithdrawalAmount(address(this).balance, address(0));
        if (amount > 0) {
            beneficiary.transfer(amount);
        }
        return amount;
    }

    function _tokenWithdrawal(IERC20 token, address payable beneficiary) private returns (uint256) {
        uint256 amount = _calculateWithdrawalAmount(token.balanceOf(address(this)), address(token));
        if (amount > 0) {
            token.safeTransfer(beneficiary, amount);
        }
        return amount;
    }

    function _calculateWithdrawalAmount(uint256 currentBalance, address token) private returns (uint256) {
        uint256 totalReceived = _tokensState[token].totalReceived;
        uint256 lastBalance = _tokensState[token].lastBalance;
        uint256 amountAlreadyGiven = _tokensState[token].amountAlreadyGiven[msg.sender];
        uint256 _currentBalance = currentBalance;
        totalReceived = totalReceived.add(_currentBalance.sub(lastBalance));
        _tokensState[token].totalReceived = totalReceived;
        uint256 amountDue = ((totalReceived.mul(recipientsShares[msg.sender])).div(10**DECIMALS)).sub(amountAlreadyGiven);
        if (amountDue == 0) {
            return amountDue;
        }
        amountAlreadyGiven = amountAlreadyGiven.add(amountDue);
        _tokensState[token].amountAlreadyGiven[msg.sender] = amountAlreadyGiven;
        _tokensState[token].lastBalance = _currentBalance.sub(amountDue);
        return amountDue;
    }

    // /////////////////// UTILITIES /////////////////////
    using SafeMathWithRequire for uint256;

    // //////////////////////// DATA /////////////////////
    struct TokenState {
        uint256 totalReceived;
        mapping(address => uint256) amountAlreadyGiven;
        uint256 lastBalance;
    }
    mapping(address => TokenState) private _tokensState;
    uint256 private constant DECIMALS = 4;

    // /////////////////// CONSTRUCTOR ////////////////////
    /// @notice Assign each recipient with its corresponding percentage.
    /// @notice Percentages are 4 decimal points, e.g. 1 % = 100
    /// @param recipients fee recipients
    /// @param percentages the corresponding percentage (from total fees held by the contract) for a recipient
    constructor(address payable[] memory recipients, uint256[] memory percentages) public {
        require(recipients.length == percentages.length, "ARRAYS_LENGTHS_SHOULD_BE_EQUAL");
        uint256 totalPercentage = 0;
        for (uint256 i = 0; i < recipients.length; i++) {
            uint256 percentage = percentages[i];
            recipientsShares[recipients[i]] = percentage;
            totalPercentage = totalPercentage.add(percentage);
        }
        require(totalPercentage == 10**DECIMALS, "PERCENTAGES_ARRAY_SHOULD_SUM_TO_100%");
    }
}
