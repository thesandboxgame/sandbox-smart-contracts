pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import "./interfaces/IStarterPack.sol";
import "./contracts_common/src/BaseWithStorage/Admin.sol";


contract StarterPack is IStarterPack, Admin {
    // /////////////////////////// Data ///////////////////////////

    mapping(address => mapping(uint256 => bool)) public nonceByCreator;

    // //////////////////////////Functions ////////////////////////

    constructor(address starterPackAdmin) public {
        _admin = starterPackAdmin;
    }

    function purchase(
        address from,
        address to,
        uint256[4] calldata catalystQuantities,
        uint256[5] calldata gemQuantities,
        uint256 nonce,
        bytes calldata signature
    ) external override payable {
        require(!nonceByCreator[to][nonce], "invalid nonce!");
        nonceByCreator[to][nonce] = true;

        emit Purchase(from, to, catalystQuantities, gemQuantities);
    }

    function withdrawAll(address to) external override onlyAdmin {
        emit Withdraw(to, 42);
    }

    function setPrices(uint256[4] calldata prices) external override onlyAdmin {
        emit SetPrices(prices);
    }
}
