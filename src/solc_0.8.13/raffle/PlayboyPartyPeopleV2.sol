pragma solidity ^0.8.13;

import "./GenericRaffle.sol";

/* solhint-disable max-states-count */
contract PlayboyPartyPeopleV2 is GenericRaffle {
    uint256 public constant MAX_SUPPLY = 1_969;

    function initialize(
        string memory baseURI,
        string memory _name,
        string memory _symbol,
        address payable _sandOwner,
        address _signAddress,
        address _trustedForwarder
    ) public initializer {
        __GenericRaffle_init(baseURI, _name, _symbol, _sandOwner, _signAddress, _trustedForwarder, MAX_SUPPLY);
    }
}
