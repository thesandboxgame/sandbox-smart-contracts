pragma solidity 0.6.5;


/**
 * @title SafeMath
 * @dev Math operations with safety checks that revert
 */
library SafeMathWithRequire {
    using SafeMathWithRequire for uint256;

    uint256 constant DECIMALS_18 = 1000000000000000000;
    uint256 constant DECIMALS_12 = 1000000000000;

    /**
     * @dev Multiplies two numbers, throws on overflow.
     */
    function mul(uint256 a, uint256 b) internal pure returns (uint256 c) {
        // Gas optimization: this is cheaper than asserting 'a' not being zero, but the
        // benefit is lost if 'b' is also tested.
        // See: https://github.com/OpenZeppelin/openzeppelin-solidity/pull/522
        if (a == 0) {
            return 0;
        }

        c = a * b;
        require(c / a == b, "overflow");
        return c;
    }

    /**
     * @dev Integer division of two numbers, truncating the quotient.
     */
    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b != 0, "divbyzero");
        // uint256 c = a / b;
        // assert(a == b * c + a % b); // There is no case in which this doesn't hold
        return a / b;
    }

    /**
     * @dev Subtracts two numbers, throws on overflow (i.e. if subtrahend is greater than minuend).
     */
    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b <= a, "undeflow");
        return a - b;
    }

    /**
     * @dev Adds two numbers, throws on overflow.
     */
    function add(uint256 a, uint256 b) internal pure returns (uint256 c) {
        c = a + b;
        require(c >= a, "overflow");
        return c;
    }

    function sqrt6(uint256 a) internal pure returns (uint256 c) {
        a = a.mul(DECIMALS_12);
        uint256 tmp = a.add(1) / 2;
        c = a;
        // tmp cannot be zero unless a = 0 which skip the loop
        while (tmp < c) {
            c = tmp;
            tmp = ((a / tmp) + tmp) / 2;
        }
    }

    function cbrt6(uint256 a) internal pure returns (uint256 c) {
        a = a.mul(DECIMALS_18);
        uint256 tmp = a.add(2) / 3;
        c = a;
        // tmp cannot be zero unless a = 0 which skip the loop
        while (tmp < c) {
            c = tmp;
            uint256 tmpSquare = tmp**2;
            require(tmpSquare > tmp, "overflow");
            tmp = ((a / tmpSquare) + (tmp * 2)) / 3;
        }
    }

    // TODO test
    function rt6_3(uint256 a) internal pure returns (uint256 c) {
        a = a.mul(DECIMALS_18);
        uint256 tmp = a.add(5) / 6;
        c = a;
        // tmp cannot be zero unless a = 0 which skip the loop
        while (tmp < c) {
            c = tmp;
            uint256 tmpFive = tmp**5;
            require(tmpFive > tmp, "overflow");
            tmp = ((a / tmpFive) + (tmp * 5)) / 6;
        }
    }
}
