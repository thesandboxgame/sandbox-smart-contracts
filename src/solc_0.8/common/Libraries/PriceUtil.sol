//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

library PriceUtil {
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
            return startingPrice + ((endingPrice - startingPrice) * secondsPassed) / duration;
        } else {
            return startingPrice - ((startingPrice - endingPrice) * secondsPassed) / duration;
        }
    }

    function calculateFee(uint256 price, uint256 fee10000th) internal pure returns (uint256) {
        // _fee < 10000, so the result will be <= price
        return (price * fee10000th) / 10000;
    }
}
