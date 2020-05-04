pragma solidity 0.6.5;

import "./BaseWithStorage/ERC20BaseToken.sol";
import "./Catalyst/CatalystToken.sol";


contract Catalyst is ERC20BaseToken, CatalystToken {
    constructor(
        string memory name,
        string memory symbol,
        address admin,
        address beneficiary,
        uint256 amount
    ) public ERC20BaseToken(name, symbol, admin, beneficiary, amount) {}

    // override is not supported by prettier-plugin-solidity : https://github.com/prettier-solidity/prettier-plugin-solidity/issues/221
    // prettier-ignore
    function getValue(
        uint256 catalystId,
        uint256 gemId,
        uint256 slotIndex,
        uint64 blockNumber
    ) external override view returns (uint32) {
        return 0;
        // TODO return BlockHashRegister.
    }
}
