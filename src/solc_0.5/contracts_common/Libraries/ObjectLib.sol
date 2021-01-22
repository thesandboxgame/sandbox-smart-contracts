pragma solidity ^0.5.2;

import "./SafeMathWithRequire.sol";

library ObjectLib {
    using SafeMathWithRequire for uint256;
    enum Operations {ADD, SUB, REPLACE}
    // Constants regarding bin or chunk sizes for balance packing
    uint256 constant TYPES_BITS_SIZE = 16; // Max size of each object
    uint256 constant TYPES_PER_UINT256 = 256 / TYPES_BITS_SIZE; // Number of types per uint256

    //
    // Objects and Tokens Functions
    //

    /**
  * @dev Return the bin number and index within that bin where ID is
  * @param _tokenId Object type
  * @return (Bin number, ID's index within that bin)
  */
    function getTokenBinIndex(uint256 _tokenId)
        internal
        pure
        returns (uint256 bin, uint256 index)
    {
        bin = (_tokenId * TYPES_BITS_SIZE) / 256;
        index = _tokenId % TYPES_PER_UINT256;
        return (bin, index);
    }

    /**
  * @dev update the balance of a type provided in _binBalances
  * @param _binBalances Uint256 containing the balances of objects
  * @param _index Index of the object in the provided bin
  * @param _amount Value to update the type balance
  * @param _operation Which operation to conduct :
  *     Operations.REPLACE : Replace type balance with _amount
  *     Operations.ADD     : ADD _amount to type balance
  *     Operations.SUB     : Substract _amount from type balance
  */
    function updateTokenBalance(
        uint256 _binBalances,
        uint256 _index,
        uint256 _amount,
        Operations _operation
    ) internal pure returns (uint256 newBinBalance) {
        uint256 objectBalance = 0;
        if (_operation == Operations.ADD) {
            objectBalance = getValueInBin(_binBalances, _index);
            newBinBalance = writeValueInBin(
                _binBalances,
                _index,
                objectBalance.add(_amount)
            );
        } else if (_operation == Operations.SUB) {
            objectBalance = getValueInBin(_binBalances, _index);
            newBinBalance = writeValueInBin(
                _binBalances,
                _index,
                objectBalance.sub(_amount)
            );
        } else if (_operation == Operations.REPLACE) {
            newBinBalance = writeValueInBin(_binBalances, _index, _amount);
        } else {
            revert("Invalid operation"); // Bad operation
        }

        return newBinBalance;
    }
    /*
  * @dev return value in _binValue at position _index
  * @param _binValue uint256 containing the balances of TYPES_PER_UINT256 types
  * @param _index index at which to retrieve value
  * @return Value at given _index in _bin
  */
    function getValueInBin(uint256 _binValue, uint256 _index)
        internal
        pure
        returns (uint256)
    {
        // Mask to retrieve data for a given binData
        uint256 mask = (uint256(1) << TYPES_BITS_SIZE) - 1;

        // Shift amount
        uint256 rightShift = 256 - TYPES_BITS_SIZE * (_index + 1);
        return (_binValue >> rightShift) & mask;
    }

    /**
  * @dev return the updated _binValue after writing _amount at _index
  * @param _binValue uint256 containing the balances of TYPES_PER_UINT256 types
  * @param _index Index at which to retrieve value
  * @param _amount Value to store at _index in _bin
  * @return Value at given _index in _bin
  */
    function writeValueInBin(uint256 _binValue, uint256 _index, uint256 _amount)
        internal
        pure
        returns (uint256)
    {
        require(
            _amount < 2**TYPES_BITS_SIZE,
            "Amount to write in bin is too large"
        );

        // Mask to retrieve data for a given binData
        uint256 mask = (uint256(1) << TYPES_BITS_SIZE) - 1;

        // Shift amount
        uint256 leftShift = 256 - TYPES_BITS_SIZE * (_index + 1);
        return (_binValue & ~(mask << leftShift)) | (_amount << leftShift);
    }

}
