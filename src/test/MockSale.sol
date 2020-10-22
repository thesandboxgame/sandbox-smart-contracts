pragma solidity 0.6.5;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

contract MockSale {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    IERC20 internal immutable PAYMENT_TOKEN;

    uint256 internal immutable PRICE;

    constructor(IERC20 paymentToken, uint256 price) public {
        PAYMENT_TOKEN = paymentToken;
        PRICE = price;
    }

    function purchaseFor(
        address buyer,
        address to,
        uint256 amount
    ) external {
        PAYMENT_TOKEN.safeTransferFrom(buyer, address(this), amount.mul(PRICE));
    }
}
