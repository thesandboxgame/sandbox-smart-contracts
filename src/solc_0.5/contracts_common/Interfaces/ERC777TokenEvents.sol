pragma solidity ^0.5.2;

/* interface */
contract ERC777TokenEvents {
    event Sent(
        address indexed operator,
        address indexed from,
        address indexed to,
        uint256 amount,
        bytes data,
        bytes operatorData
    ); // solhint-disable-next-line separate-by-one-line-in-contract
    event Minted(
        address indexed operator,
        address indexed to,
        uint256 amount,
        bytes operatorData
    );
    event Burned(
        address indexed operator,
        address indexed from,
        uint256 amount,
        bytes data,
        bytes operatorData
    );
    event AuthorizedOperator(
        address indexed operator,
        address indexed tokenHolder
    );
    event RevokedOperator(
        address indexed operator,
        address indexed tokenHolder
    );
}
