/* solhint-disable not-rely-on-time, func-order */

pragma solidity 0.5.9;

import "../contracts_common/Libraries/SafeMathWithRequire.sol";
import "../Land.sol";
import "../contracts_common/Interfaces/ERC20.sol";
import "../contracts_common/BaseWithStorage/MetaTransactionReceiver.sol";
import "../contracts_common/Interfaces/Medianizer.sol";
import "../ReferralValidator/ReferralValidator.sol";


/**
 * @title Land Sale contract with referral that supports also DAI and ETH as payment
 * @notice This contract mananges the sale of our lands
 */
contract LandSaleWithReferral is MetaTransactionReceiver, ReferralValidator {
    using SafeMathWithRequire for uint256;

    uint256 internal constant GRID_SIZE = 408; // 408 is the size of the Land
    uint256 internal constant daiPrice = 14400000000000000;

    Land internal _land;
    ERC20 internal _sand;
    Medianizer private _medianizer;
    ERC20 private _dai;

    address payable internal _wallet;
    uint256 internal _expiryTime;
    bytes32 internal _merkleRoot;

    bool _sandEnabled = false;
    bool _etherEnabled = true;
    bool _daiEnabled = false;

    event LandQuadPurchased(
        address indexed buyer,
        address indexed to,
        uint256 indexed topCornerId,
        uint256 size,
        uint256 price,
        address token,
        uint256 amountPaid
    );

    constructor(
        address landAddress,
        address sandContractAddress,
        address initialMetaTx,
        address admin,
        address payable initialWalletAddress,
        bytes32 merkleRoot,
        uint256 expiryTime,
        address medianizerContractAddress,
        address daiTokenContractAddress,
        address initialSigningWallet,
        uint256 initialMaxCommissionRate
    ) public ReferralValidator(
        initialSigningWallet,
        initialMaxCommissionRate
    ) {
        _land = Land(landAddress);
        _sand = ERC20(sandContractAddress);
        _setMetaTransactionProcessor(initialMetaTx, true);
        _wallet = initialWalletAddress;
        _merkleRoot = merkleRoot;
        _expiryTime = expiryTime;
        _medianizer = Medianizer(medianizerContractAddress);
        _dai = ERC20(daiTokenContractAddress);
        _admin = admin;
    }

    /// @notice set the wallet receiving the proceeds
    /// @param newWallet address of the new receiving wallet
    function setReceivingWallet(address payable newWallet) external{
        require(newWallet != address(0), "receiving wallet cannot be zero address");
        require(msg.sender == _admin, "only admin can change the receiving wallet");
        _wallet = newWallet;
    }

    /// @notice enable/disable DAI payment for Lands
    /// @param enabled whether to enable or disable
    function setDAIEnabled(bool enabled) external {
        require(msg.sender == _admin, "only admin can enable/disable DAI");
        _daiEnabled = enabled;
    }

    /// @notice return whether DAI payments are enabled
    /// @return whether DAI payments are enabled
    function isDAIEnabled() external view returns (bool) {
        return _daiEnabled;
    }

    /// @notice enable/disable ETH payment for Lands
    /// @param enabled whether to enable or disable
    function setETHEnabled(bool enabled) external {
        require(msg.sender == _admin, "only admin can enable/disable ETH");
        _etherEnabled = enabled;
    }

    /// @notice return whether ETH payments are enabled
    /// @return whether ETH payments are enabled
    function isETHEnabled() external view returns (bool) {
        return _etherEnabled;
    }

    /// @notice enable/disable the specific SAND payment for Lands
    /// @param enabled whether to enable or disable
    function setSANDEnabled(bool enabled) external {
        require(msg.sender == _admin, "only admin can enable/disable SAND");
        _sandEnabled = enabled;
    }

    /// @notice return whether the specific SAND payments are enabled
    /// @return whether the specific SAND payments are enabled
    function isSANDEnabled() external view returns (bool) {
        return _sandEnabled;
    }

    function _checkValidity(
        address buyer,
        address reserved,
        uint256 x,
        uint256 y,
        uint256 size,
        uint256 price,
        bytes32 salt,
        bytes32[] memory proof
    ) internal view {
        /* solium-disable-next-line security/no-block-members */
        require(block.timestamp < _expiryTime, "sale is over");
        require(buyer == msg.sender || _metaTransactionContracts[msg.sender], "not authorized");
        require(reserved == address(0) || reserved == buyer, "cannot buy reserved Land");
        bytes32 leaf = _generateLandHash(x, y, size, price, reserved, salt);

        require(
            _verify(proof, leaf),
            "Invalid land provided"
        );
    }

    function _mint(address buyer, address to, uint256 x, uint256 y, uint256 size, uint256 price, address token, uint256 tokenAmount) internal {
        uint256[] memory junctions = new uint256[](0);
        _land.mintQuad(to, size, x, y, abi.encode(to, junctions)); // TODO audit
        emit LandQuadPurchased(buyer, to, x + (y * GRID_SIZE), size, price, token, tokenAmount);
    }

    /**
     * @notice buy Land with SAND using the merkle proof associated with it
     * @param buyer address that perform the payment
     * @param to address that will own the purchased Land
     * @param reserved the reserved address (if any)
     * @param x x coordinate of the Land
     * @param y y coordinate of the Land
     * @param size size of the pack of Land to purchase
     * @param priceInSand price in SAND to purchase that Land
     * @param proof merkleProof for that particular Land
     * @return The address of the operator
     */
    function buyLandWithSand(
        address buyer,
        address to,
        address reserved,
        uint256 x,
        uint256 y,
        uint256 size,
        uint256 priceInSand,
        bytes32 salt,
        bytes32[] calldata proof,
        bytes calldata referral
    ) external {
        require(_sandEnabled, "sand payments not enabled");
        _checkValidity(buyer, reserved, x, y, size, priceInSand, salt, proof);

        handleReferralWithERC20(
            buyer,
            priceInSand,
            referral,
            _wallet,
            address(_sand)
        );

        _mint(buyer, to, x, y, size, priceInSand, address(_sand), priceInSand);
    }

    /**
     * @notice buy Land with ETH using the merkle proof associated with it
     * @param buyer address that perform the payment
     * @param to address that will own the purchased Land
     * @param reserved the reserved address (if any)
     * @param x x coordinate of the Land
     * @param y y coordinate of the Land
     * @param size size of the pack of Land to purchase
     * @param priceInSand price in SAND to purchase that Land
     * @param proof merkleProof for that particular Land
     * @param referral the referral used by the buyer
     * @return The address of the operator
     */
    function buyLandWithETH(
        address buyer,
        address to,
        address reserved,
        uint256 x,
        uint256 y,
        uint256 size,
        uint256 priceInSand,
        bytes32 salt,
        bytes32[] calldata proof,
        bytes calldata referral
    ) external payable {
        require(_etherEnabled, "ether payments not enabled");
        _checkValidity(buyer, reserved, x, y, size, priceInSand, salt, proof);

        uint256 ETHRequired = getEtherAmountWithSAND(priceInSand);
        require(msg.value >= ETHRequired, "not enough ether sent");

        if (msg.value - ETHRequired > 0) {
            msg.sender.transfer(msg.value - ETHRequired); // refund extra
        }

        handleReferralWithETH(
            ETHRequired,
            referral,
            _wallet
        );

        _mint(buyer, to, x, y, size, priceInSand, address(0), ETHRequired);
    }

    /**
     * @notice buy Land with DAI using the merkle proof associated with it
     * @param buyer address that perform the payment
     * @param to address that will own the purchased Land
     * @param reserved the reserved address (if any)
     * @param x x coordinate of the Land
     * @param y y coordinate of the Land
     * @param size size of the pack of Land to purchase
     * @param priceInSand price in SAND to purchase that Land
     * @param proof merkleProof for that particular Land
     * @return The address of the operator
     */
    function buyLandWithDAI(
        address buyer,
        address to,
        address reserved,
        uint256 x,
        uint256 y,
        uint256 size,
        uint256 priceInSand,
        bytes32 salt,
        bytes32[] calldata proof,
        bytes calldata referral
    ) external {
        require(_daiEnabled, "dai payments not enabled");
        _checkValidity(buyer, reserved, x, y, size, priceInSand, salt, proof);

        uint256 DAIRequired = priceInSand.mul(daiPrice).div(1000000000000000000);

        handleReferralWithERC20(
            buyer,
            DAIRequired,
            referral,
            _wallet,
            address(_dai)
        );

        _mint(buyer, to, x, y, size, priceInSand, address(_dai), DAIRequired);
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
        uint256 x,
        uint256 y,
        uint256 size,
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

    /**
     * @notice Returns the amount of ETH for a specific amount of SAND
     * @param sandAmount An amount of SAND
     * @return The amount of ETH
     */
    function getEtherAmountWithSAND(uint256 sandAmount) public view returns (uint256) {
        uint256 ethUsdPair = getEthUsdPair();
        return sandAmount.mul(daiPrice).div(ethUsdPair);
    }

    /**
     * @notice Gets the ETHUSD pair from the Medianizer contract
     * @return The pair as an uint256
     */
    function getEthUsdPair() internal view returns (uint256) {
        bytes32 pair = _medianizer.read();
        return uint256(pair);
    }
}
