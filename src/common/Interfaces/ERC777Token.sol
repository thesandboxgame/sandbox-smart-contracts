/* This Source Code Form is subject to the terms of the Mozilla external
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * This code has not been reviewed.
 * Do not use or deploy this code before reviewing it personally first.
 */
// solhint-disable-next-line compiler-fixed
pragma solidity 0.6.5;


interface ERC777Token {
    function name() external view returns (string memory);

    function symbol() external view returns (string memory);

    function totalSupply() external view returns (uint256);

    function balanceOf(address owner) external view returns (uint256);

    function granularity() external view returns (uint256);

    function defaultOperators() external view returns (address[] memory);

    function isOperatorFor(address operator, address tokenHolder) external view returns (bool);

    function authorizeOperator(address operator) external;

    function revokeOperator(address operator) external;

    function send(
        address to,
        uint256 amount,
        bytes calldata data
    ) external;

    function operatorSend(
        address from,
        address to,
        uint256 amount,
        bytes calldata data,
        bytes calldata operatorData
    ) external;

    // function burn(uint256 amount, bytes data) external;
    // function operatorBurn(address from, uint256 amount, bytes data, bytes operatorData) external;

    event Sent(address indexed operator, address indexed from, address indexed to, uint256 amount, bytes data, bytes operatorData); // solhint-disable-next-line separate-by-one-line-in-contract
    event Minted(address indexed operator, address indexed to, uint256 amount, bytes operatorData);
    event Burned(address indexed operator, address indexed from, uint256 amount, bytes data, bytes operatorData);
    event AuthorizedOperator(address indexed operator, address indexed tokenHolder);
    event RevokedOperator(address indexed operator, address indexed tokenHolder);
}
