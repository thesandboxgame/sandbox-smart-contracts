pragma solidity 0.6.5;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../common/BaseWithStorage/Admin.sol";


contract ERC20FixedExchangeForwarder is Admin {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;
    using Address for address;

    uint256 internal constant MAX_UINT = uint256(-1);
    uint256 internal constant DECIMLAS_18 = 1000000000000000000;

    IERC20 internal immutable TOKEN_TO_RECEIVE;
    IERC20 internal immutable TOKEN_TO_SEND;
    address internal immutable RECIPIENT;

    uint256 internal _sentReceivedRate_18;

    constructor(
        IERC20 tokenToSend,
        IERC20 tokenToReceive,
        uint256 sentReceivedRate18,
        address recipient,
        address admin
    ) public {
        TOKEN_TO_RECEIVE = tokenToReceive;
        TOKEN_TO_SEND = tokenToSend;
        _sentReceivedRate_18 = sentReceivedRate18;
        RECIPIENT = recipient;
        _admin = admin;
    }

    function forward(address to, bytes calldata data) external returns (bytes memory returnData) {
        uint256 balanceBefore = TOKEN_TO_SEND.balanceOf(address(this));
        TOKEN_TO_SEND.approve(to, MAX_UINT);
        returnData = to.functionCall(data);
        uint256 balanceAfter = TOKEN_TO_SEND.balanceOf(address(this));
        if (balanceAfter < balanceBefore) {
            uint256 amountSent = balanceBefore.sub(balanceAfter);
            uint256 amountToReceive = amountSent.mul(_sentReceivedRate_18).div(DECIMLAS_18);
            TOKEN_TO_RECEIVE.safeTransferFrom(msg.sender, RECIPIENT, amountToReceive);
        } else if (balanceAfter > balanceBefore) {
            uint256 amountReceived = balanceAfter.sub(balanceBefore);
            TOKEN_TO_SEND.safeTransferFrom(address(this), msg.sender, amountReceived);
        }
    }

    function updateRate(uint256 newRate_18) external onlyAdmin {
        _sentReceivedRate_18 = newRate_18;
    }
}
