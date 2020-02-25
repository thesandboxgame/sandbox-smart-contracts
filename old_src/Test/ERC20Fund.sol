pragma solidity 0.5.9;

import "../../contracts_common/src/Interfaces/ERC20.sol";

contract ERC20Fund {
    ERC20 token;
    address owner;

    constructor(ERC20 _token) public {
        token = _token;
        owner = msg.sender;
    }

    function take(address _from, uint256 _amount) public returns (bool) {
        return token.transferFrom(_from, address(this), _amount);
    }

    function give(address _to, uint256 _amount) public returns (bool) {
        require(msg.sender == owner, "only onwer can give");
        return token.transfer(_to, _amount);
    }

    function fail() external pure {
        require(false, "fail");
    }
}
