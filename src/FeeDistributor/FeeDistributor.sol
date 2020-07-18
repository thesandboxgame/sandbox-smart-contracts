pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import "../contracts_common/src/interfaces/ERC20.sol";
import "../contracts_common/src/Libraries/SafeMath.sol";


contract FeeDistributor {
    using SafeMath for uint256;

    event Deposit(address asset, address from, uint256 amount);
    event Withdrawl(address asset, address to, uint256 amount);
    mapping(address => uint256) public recepientsShares;
    struct AssetState {
        uint256 totalReceived;
        mapping(address => uint256) amountAlreadyGiven;
        uint256 lastBalance;
    }
    mapping(address => AssetState) public assetsState;

    constructor(address payable[] memory _recepients, uint256[] memory _precentages) public {
        require(_recepients.length == _precentages.length);
        for (uint256 i = 0; i < _recepients.length; i++) {
            recepientsShares[_recepients[i]] = _precentages[i];
        }
    }

    function withdraw(address _asset) external {
        uint256 amount;
        if (_asset == address(0)) {
            amount = etherWithdrawal();
        } else {
            amount = tokenWithdrawal(_asset);
        }
        emit Withdrawl(_asset, msg.sender, amount);
    }

    function etherWithdrawal() private returns (uint256) {
        uint256 amount = calculateWithdrawalAmount(address(this).balance, address(0));
        msg.sender.transfer(amount);
        return amount;
    }

    function tokenWithdrawal(address _token) private returns (uint256) {
        uint256 amount = calculateWithdrawalAmount(ERC20(_token).balanceOf(address(this)), _token);
        require(ERC20(_token).transfer(msg.sender, amount));
        return amount;
    }

    function calculateWithdrawalAmount(uint256 _currentBalance, address _asset) private returns (uint256) {
        uint256 totalReceived = assetsState[_asset].totalReceived;
        uint256 lastBalance = assetsState[_asset].lastBalance;
        uint256 amountAlreadyGiven = assetsState[_asset].amountAlreadyGiven[msg.sender];
        totalReceived = totalReceived.add(_currentBalance.sub(lastBalance));
        assetsState[_asset].totalReceived = totalReceived;
        uint256 amountDue = ((totalReceived.mul(recepientsShares[msg.sender])).div(100)).sub(amountAlreadyGiven);
        require(amountDue > 0, "Withdrawal of zero amount");
        amountAlreadyGiven = amountAlreadyGiven.add(amountDue);
        assetsState[_asset].amountAlreadyGiven[msg.sender] = amountAlreadyGiven;
        assetsState[_asset].lastBalance = _currentBalance.sub(amountDue);
        return amountDue;
    }

    receive() external payable {
        emit Deposit(address(0), msg.sender, msg.value);
    }
}
