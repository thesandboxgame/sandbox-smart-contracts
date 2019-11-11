pragma solidity 0.5.9;

import "../Land.sol";
import "../../contracts_common/src/Interfaces/ERC20.sol";
import "../../contracts_common/src/BaseWithStorage/MetaTransactionReceiver.sol";

/**
 * @title Land Sale contract
 * @notice This contract mananges the sale of our lands
 */
contract LandSale is MetaTransactionReceiver {
    Land internal _land;
    ERC20 internal _erc20;
    address payable internal _wallet;

    bytes32 internal _merkleRoot;

    event LandQuadPurchased(address indexed buyer, address indexed to, uint256 indexed topCornerId, uint16 size, uint256 price);

    constructor(
        address landAddress,
        address erc20ContractAddress,
        address initialMetaTx,
        address admin,
        address payable initialWalletAddress,
        bytes32 merkleRoot
    ) public {
        _land = Land(landAddress);
        _erc20 = ERC20(erc20ContractAddress);
        _setMetaTransactionProcessor(initialMetaTx, true);
        _admin = admin;
        _wallet = initialWalletAddress;
        _merkleRoot = merkleRoot;
    }

    function merkleRoot() external view returns(bytes32) {
        return _merkleRoot;
    }

    /**
     * @notice buy Land using the merkle proof associated with it
     * @param buyer address that perform the payment
     * @param to address that will owne the Land purchased
     * @param x x coordinate of the Land
     * @param y  coordinayte of the Land
     * @param size size of the pack of Land to purchase
     * @param price amount of Sand to purchase that Land
     * @param proof merkleProof for that particular Land
     * @return The address of the operator
     */
    function buyLand(
        address buyer,
        address to,
        address reserved,
        uint16 x,
        uint16 y,
        uint16 size,
        uint256 price,
        bytes32[] calldata proof
    ) external {
        require(buyer == msg.sender || _metaTransactionContracts[msg.sender], "not authorized");
        require(reserved == address(0) || reserved == buyer, "cannot buy reserved Land");
        bytes32 leaf = _generateLandHash(x, y, size, price, reserved);

        require(
            _verify(proof, leaf),
            "Invalid land provided"
        );

        require(
            _erc20.transferFrom(
                buyer,
                _wallet,
                price
            ),
            "erc20 transfer failed"
        );

        _land.mintQuad(to, size, x, y);
	emit LandQuadPurchased(buyer, to, x + (y * 408), size, price); // 408 is the size of the Land
    }

    function _generateLandHash(
        uint16 x,
        uint16 y,
        uint16 size,
        uint256 price,
        address reserved
    ) internal pure returns (
        bytes32
    ) {
        return keccak256(
            abi.encodePacked(
                x,
                y,
                size,
                price,
                reserved
            )
        );
    }

    function _verify(bytes32[] memory proof, bytes32 leaf) internal view returns (bool) {
        bytes32 computedHash = leaf;

        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];

            if (computedHash < proofElement) {
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }

        return computedHash == _merkleRoot;
    }
}
