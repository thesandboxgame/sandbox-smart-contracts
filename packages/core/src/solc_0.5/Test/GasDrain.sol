pragma solidity 0.5.9;

contract GasDrain {
    mapping(uint256 => uint256) store;

    function receiveAnyToken(
        address sender,
        address token,
        uint256 id,
        uint256 value,
        uint256 amoutOfGas
    ) external {
        uint256 start = gasleft() + 500; // TODO
        uint256 i = 1;
        while (start - gasleft() < amoutOfGas) {
            i++;
        }
    }

    function receiveSpecificERC20(address, uint256, uint256 amoutOfGas)
        external
    {
        uint256 start = gasleft() + 303; // 301 for amoutOfGas == 3000000 // 321 for amountOfGas == 2000000 // 303 for amountOfGas == 5000000
        while (start - gasleft() < amoutOfGas) {}
    }

    function receiveSpecificERC20IfEnoughGas(
        address,
        uint256,
        uint256 amoutOfGas
    ) external {
        assert(gasleft() > amoutOfGas - 231); // 231 for amoutOfGas == 5000000
    }

    function receive(uint256 amoutOfGas) external view {
        uint256 start = gasleft() + 301;
        while (start - gasleft() < amoutOfGas) {}
    }

    function receiveWithData(uint256 amoutOfGas, bytes calldata) external view {
        uint256 start = gasleft() + 427;
        while (start - gasleft() < amoutOfGas) {}
    }
}
