pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import "../contracts_common/src/interfaces/ERC20.sol";
import "../contracts_common/src/Libraries/SafeMathWithRequire.sol";


/// @title Fee distributor
/// @notice Distributes all fees collected from platform activities to stakeholders
contract FeeDistributor {
    using SafeMathWithRequire for uint256;

    event Deposit(address token, address from, uint256 amount);
    event Withdrawl(ERC20 token, address to, uint256 amount);
    mapping(address => uint256) public recepientsShares;
    struct TokenState {
        uint256 totalReceived;
        mapping(address => uint256) amountAlreadyGiven;
        uint256 lastBalance;
    }
    mapping(address => TokenState) private _tokensState;

    /// @notice Assign each recepient with its corresponding percentage
    /// @dev percentages are 4 decimal points, e.g. 1 % = 100
    /// @param recepients fee recepients
    /// @param percentages the corresponding percentage (from total fees held by the contract) for a recepient
    constructor(address payable[] memory recepients, uint256[] memory percentages) public {
        require(recepients.length == percentages.length, "ARRAYS LENGTHS SHOULD BE EQUAL");
        for (uint256 i = 0; i < recepients.length; i++) {
            recepientsShares[recepients[i]] = percentages[i];
        }
    }

    /// @notice enable fee holder to withdraw its share
    /// @dev zero address reserved for ether withdrawal
    /// @param token the token that fee should be distributed in
    function withdraw(ERC20 token) external returns (uint256 amount) {
        if (address(token) == address(0)) {
            amount = etherWithdrawal();
        } else {
            amount = tokenWithdrawal(token);
        }
        emit Withdrawl(token, msg.sender, amount);
    }

    function etherWithdrawal() private returns (uint256) {
        uint256 amount = calculateWithdrawalAmount(address(this).balance, address(0));
        if (amount > 0) {
            msg.sender.transfer(amount);
        }
        return amount;
    }

    function tokenWithdrawal(ERC20 token) private returns (uint256) {
        uint256 amount = calculateWithdrawalAmount(ERC20(token).balanceOf(address(this)), address(token));
        if (amount > 0) {
            require(ERC20(token).transfer(msg.sender, amount));
        }
        return amount;
    }

    function calculateWithdrawalAmount(uint256 currentBalance, address token) private returns (uint256) {
        uint256 totalReceived = _tokensState[token].totalReceived;
        uint256 lastBalance = _tokensState[token].lastBalance;
        uint256 amountAlreadyGiven = _tokensState[token].amountAlreadyGiven[msg.sender];
        uint256 _currentBalance = currentBalance;
        totalReceived = totalReceived.add(_currentBalance.sub(lastBalance));
        _tokensState[token].totalReceived = totalReceived;
        uint256 amountDue = ((totalReceived.mul(recepientsShares[msg.sender])).div(10000)).sub(amountAlreadyGiven);
        if (amountDue == 0) {
            return amountDue;
        }
        amountAlreadyGiven = amountAlreadyGiven.add(amountDue);
        _tokensState[token].amountAlreadyGiven[msg.sender] = amountAlreadyGiven;
        _tokensState[token].lastBalance = _currentBalance.sub(amountDue);
        return amountDue;
    }

    receive() external payable {
        emit Deposit(address(0), msg.sender, msg.value);
    }
}
