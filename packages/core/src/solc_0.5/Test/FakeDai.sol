pragma solidity 0.5.9;

import '../Sand/erc20/ERC20BaseToken.sol';


contract FakeDai is ERC20BaseToken {
  constructor() public {
    _mint(msg.sender, 3000000000 * 10 ** 18);
  }
}
