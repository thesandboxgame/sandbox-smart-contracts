pragma solidity 0.6.5;

import "./SafeMathWithRequire.sol";


library PriceUtil {
    using SafeMathWithRequire for uint256;

    function calculateCurrentPrice(
        uint256 startingPrice,
        uint256 endingPrice,
        uint256 duration,
        uint256 secondsPassed
    ) internal pure returns (uint256) {
        if (secondsPassed > duration) {
            return endingPrice;
        }
        if (endingPrice == startingPrice) {
            return endingPrice;
        } else if (endingPrice > startingPrice) {
            return startingPrice.add((endingPrice.sub(startingPrice)).mul(secondsPassed).div(duration));
        } else {
            return startingPrice.sub((startingPrice.sub(endingPrice)).mul(secondsPassed).div(duration));
        }
    }

    function calculateFee(uint256 price, uint256 fee10000th) internal pure returns (uint256) {
        // _fee < 10000, so the result will be <= price
        return (price.mul(fee10000th)) / 10000;
    }
}
