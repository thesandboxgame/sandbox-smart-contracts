pragma solidity 0.6.5;


interface IStarterPack {
    event Purchase(address indexed from, address indexed to, uint256[] catQuantities, uint256[] gemQuantities);

    event SetPrices(uint256[] prices);

    event Withdraw(address indexed to, uint256 amount);

    function purchase(
        address from,
        address to,
        uint256[4] catalystQuantities,
        uint256[5] gemQuantities,
        uint256 nonce,
        bytes calldata signature
    ) external payable;

    function setPrices(uint256[4] calldata prices) external onlyAdmin;

    function withdrawAll(address to) external onlyAdmin;
}
