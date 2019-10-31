pragma solidity 0.5.9;

import "../../contracts_common/src/Libraries/SafeMathWithRequire.sol";
import "../../contracts_common/src/Interfaces/ERC20.sol";
import "../../contracts_common/src/Interfaces/Medianizer.sol";
import "../../contracts_common/src/BaseWithStorage/Admin.sol";
import "../Asset/ERC1155ERC721.sol";


contract BundleSandSale is Admin {
    bytes4 private constant ERC1155_RECEIVED = 0xf23a6e61;
    bytes4 private constant ERC1155_BATCH_RECEIVED = 0xbc197c81;

    using SafeMathWithRequire for uint256;

    Medianizer private _medianizer;
    ERC20 private _dai;
    ERC20 private _sand;
    ERC1155ERC721 _asset;

    address payable private _receivingWallet;
    uint256[] _packIds;
    uint256[] _packAmounts;
    uint256 _sandAmountPerPack;
    uint256 _priceUSDPerPack;

    constructor(
        address sandTokenContractAddress,
        address assetTokenContractAddress,
        address medianizerContractAddress,
        address daiTokenContractAddress,
        address admin,
        address payable initialWallet,
        uint256[] memory packIds,
        uint256[] memory packAmounts,
        uint256 sandAmountPerPack,
        uint256 priceUSDPerPack
    ) public {
        require(initialWallet != address(0), "need a wallet to receive funds");
        _medianizer = Medianizer(medianizerContractAddress);
        _sand = ERC20(sandTokenContractAddress);
        _asset = ERC1155ERC721(assetTokenContractAddress);
        _dai = ERC20(daiTokenContractAddress);
        _admin = admin;
        _receivingWallet = initialWallet;
        _packIds = packIds;
        _packIds = packAmounts;
        _sandAmountPerPack = sandAmountPerPack;
        _priceUSDPerPack = priceUSDPerPack;
    }

    function _transferPack(uint256 numPacks, address to) internal {
        require(
            _sand.transferFrom(address(this), to, _sandAmountPerPack.mul(numPacks)),
            "Transfer failed"
        );
        uint256 numIds = _packAmounts.length;
        uint256[] memory packAmounts = new uint256[](numIds);
        for (uint256 i = 0; i< numIds; i++) {
            packAmounts[i] = _packAmounts[i].mul(numPacks);
        }
        _asset.safeBatchTransferFrom(address(this), to, _packIds, packAmounts, "");
    }

    /**
     * @notice Buys Sand Bundle with Ether
     * @param numPacks the amount of packs to buy
     * @param to The address that will receive the SAND
     */
    function buyBundleWithEther(uint256 numPacks, address to) external payable {
        uint256 USDRequired = numPacks.mul(_priceUSDPerPack);
        uint256 ETHRequired = getEtherAmountWithUSD(USDRequired);
        require(msg.value >= ETHRequired, "not enough ether sent");
        uint256 leftOver = msg.value - ETHRequired;
        if(leftOver > 0) {
            msg.sender.transfer(leftOver); // refund extra
        }
        
        _transferPack(numPacks, to);

        address(_receivingWallet).transfer(ETHRequired);
    }

    /**
     * @notice Buys Sand Bundle with DAI
     * @param numPacks the amount of packs to buy
     * @param to The address that will receive the SAND
     */
    function buyBundleWithDai(uint256 numPacks, address to) external {
        uint256 USDRequired = numPacks.mul(_priceUSDPerPack);
        require(_dai.transferFrom(msg.sender, _receivingWallet, USDRequired), "failed to transfer dai");        
        _transferPack(numPacks, to);
    }

    /**
     * @notice Transfers the SAND balance from this contract to another address
     * @param to The address that will receive the funds
     * @param amount The amount to transfer
     */
    function withdrawSand(address to, uint256 amount) external onlyAdmin() {
        require(
            _sand.transferFrom(address(this), to, amount),
            "Transfer failed"
        );
    }

    function withdrawERC20(ERC20 token, address to, uint256 amount) external onlyAdmin() {
        require(
            token.transferFrom(address(this), to, amount),
            "Transfer failed"
        );
    }

    /**
     * @notice Transfers Assets from this contract to another address
     * @param to The address that will receive the funds
     * @param ids ids of the Asset to transfer
     * @param amounts The amounts to transfer
     */
    function withdrawAssets(address to, uint256[] calldata ids, uint256[] calldata amounts) external onlyAdmin() {
        _asset.safeBatchTransferFrom(address(this), to, ids, amounts, "");
    }

    /**
     * @notice Returns the amount of USD for a specific amount of ETH
     * @param ethAmount An amount of ETH
     * @return The amount of USD
     */
    function getUSDAmountWithEther(uint256 ethAmount) public view returns (uint256) {
        uint256 ethUsdPair = getEthUsdPair();
        return ethAmount.mul(ethUsdPair);
    }

    /**
     * @notice Returns the amount of ETH for a specific amount of USD
     * @param usdAmount An amount of USD
     * @return The amount of ETH
     */
    function getEtherAmountWithUSD(uint256 usdAmount) public view returns (uint256) {
        uint256 ethUsdPair = getEthUsdPair();
        return usdAmount.div(ethUsdPair);
    }

    /**
     * @notice Gets the ETHUSD pair from the Medianizer contract
     * @return The pair as an uint256
     */
    function getEthUsdPair() internal view returns (uint256) {
        bytes32 pair = _medianizer.read();
        return uint256(pair);
    }

    function onERC1155Received(
        address _operator,
        address _from,
        uint256 _id,
        uint256 _value,
        bytes calldata _data
    ) external returns (bytes4) {
        require(
            address(_asset) == msg.sender,
            "only accept asset as sender"
        );
        return ERC1155_RECEIVED;
    }

    function onERC1155BatchReceived(
        address _operator,
        address _from,
        uint256[] calldata _ids,
        uint256[] calldata _values,
        bytes calldata _data
    ) external returns (bytes4) {
        require(
            address(_asset) == msg.sender,
            "only accept asset as sender"
        );
        return ERC1155_BATCH_RECEIVED;
    }
}
