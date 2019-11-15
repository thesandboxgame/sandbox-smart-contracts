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
    uint256 internal _expiryTime;
    bytes32 internal _merkleRoot;

    event LandQuadPurchased(
        address indexed buyer,
        address indexed to,
        uint256 indexed topCornerId,
        uint16 size,
        uint256 price
    );

    constructor(
        address landAddress,
        address erc20ContractAddress,
        address initialMetaTx,
        address admin,
        address payable initialWalletAddress,
        bytes32 merkleRoot,
        uint256 expiryTime
    ) public {
        _land = Land(landAddress);
        _erc20 = ERC20(erc20ContractAddress);
        _setMetaTransactionProcessor(initialMetaTx, true);
        _admin = admin;
        _wallet = initialWalletAddress;
        _merkleRoot = merkleRoot;
        _expiryTime = expiryTime;
    }

    /**
     * @notice buy Land using the merkle proof associated with it
     * @param buyer address that perform the payment
     * @param to address that will own the purchased Land
     * @param reserved the reserved address (if any)
     * @param x x coordinate of the Land
     * @param y y coordinate of the Land
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
        bytes32 salt,
        bytes32[] calldata proof
    ) external {
        /* solhint-disable-next-line not-rely-on-time */
        require(block.timestamp < _expiryTime, "sale is over");
        require(buyer == msg.sender || _metaTransactionContracts[msg.sender], "not authorized");
        require(reserved == address(0) || reserved == buyer, "cannot buy reserved Land");
        bytes32 leaf = _generateLandHash(x, y, size, price, reserved, salt);

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

    /**
     * @notice Gets the expiry time for the current sale
     * @return The expiry time, as a unix epoch
     */
    function getExpiryTime() external view returns(uint256) {
        return _expiryTime;
    }

    /**
     * @notice Gets the Merkle root associated with the current sale
     * @return The Merkle root, as a bytes32 hash
     */
    function merkleRoot() external view returns(bytes32) {
        return _merkleRoot;
    }

    function _generateLandHash(
        uint16 x,
        uint16 y,
        uint16 size,
        uint256 price,
        address reserved,
        bytes32 salt
    ) internal pure returns (
        bytes32
    ) {
        return keccak256(
            abi.encodePacked(
                x,
                y,
                size,
                price,
                reserved,
                salt
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
