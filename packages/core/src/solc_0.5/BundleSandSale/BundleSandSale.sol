pragma solidity 0.5.9;

import "../contracts_common/Libraries/SafeMathWithRequire.sol";
import "../contracts_common/Interfaces/ERC20.sol";
import "../contracts_common/Interfaces/Medianizer.sol";
import "../contracts_common/BaseWithStorage/Admin.sol";
import "../Asset/ERC1155ERC721.sol";


contract BundleSandSale is Admin {
    bytes4 private constant ERC1155_RECEIVED = 0xf23a6e61;
    bytes4 private constant ERC1155_BATCH_RECEIVED = 0xbc197c81;

    event BundleSale(
        uint256 indexed saleId,
        uint256[] ids,
        uint256[] amounts,
        uint256 sandAmount,
        uint256 priceUSD,
        uint256 numPacks
    );

    event BundleSold(
        uint256 indexed saleId,
        address indexed buyer,
        uint256 numPacks,
        address token,
        uint256 tokenAmount
    );

    using SafeMathWithRequire for uint256;

    Medianizer private _medianizer;
    ERC20 private _dai;
    ERC20 private _sand;
    ERC1155ERC721 private _asset;

    address payable private _receivingWallet;

    struct Sale {
        uint256[] ids;
        uint256[] amounts;
        uint256 sandAmount;
        uint256 priceUSD;
        uint256 numPacksLeft;
    }

    Sale[] private sales;

    constructor(
        address sandTokenContractAddress,
        address assetTokenContractAddress,
        address medianizerContractAddress,
        address daiTokenContractAddress,
        address admin,
        address payable receivingWallet
    ) public {
        require(receivingWallet != address(0), "need a wallet to receive funds");
        _medianizer = Medianizer(medianizerContractAddress);
        _sand = ERC20(sandTokenContractAddress);
        _asset = ERC1155ERC721(assetTokenContractAddress);
        _dai = ERC20(daiTokenContractAddress);
        _admin = admin;
        _receivingWallet = receivingWallet;
    }

    /// @notice set the wallet receiving the proceeds
    /// @param newWallet address of the new receiving wallet
    function setReceivingWallet(address payable newWallet) external {
        require(newWallet != address(0), "receiving wallet cannot be zero address");
        require(msg.sender == _admin, "only admin can change the receiving wallet");
        _receivingWallet = newWallet;
    }

    function _transferPack(uint256 saleIndex, uint256 numPacks, address to) internal {
        uint256 sandAmountPerPack = sales[saleIndex].sandAmount;
        require(
            _sand.transferFrom(address(this), to, sandAmountPerPack.mul(numPacks)),
            "Sand Transfer failed"
        );
        uint256[] memory ids = sales[saleIndex].ids;
        uint256[] memory amounts = sales[saleIndex].amounts;
        uint256 numIds = ids.length;
        for (uint256 i = 0; i < numIds; i++) {
            amounts[i] = amounts[i].mul(numPacks);
        }
        _asset.safeBatchTransferFrom(address(this), to, ids, amounts, "");
    }

    /**
     * @notice Buys Sand Bundle with Ether
     * @param saleId id of the bundle
     * @param numPacks the amount of packs to buy
     * @param to The address that will receive the SAND
     */
    function buyBundleWithEther(uint256 saleId, uint256 numPacks, address to) external payable {
        require(saleId > 0, "invalid saleId");
        uint256 saleIndex = saleId - 1;
        uint256 numPacksLeft = sales[saleIndex].numPacksLeft;
        require(numPacksLeft >= numPacks, "not enough packs on sale");
        sales[saleIndex].numPacksLeft = numPacksLeft - numPacks;

        uint256 USDRequired = numPacks.mul(sales[saleIndex].priceUSD);
        uint256 ETHRequired = getEtherAmountWithUSD(USDRequired);
        require(msg.value >= ETHRequired, "not enough ether sent");
        uint256 leftOver = msg.value - ETHRequired;
        if(leftOver > 0) {
            msg.sender.transfer(leftOver); // refund extra
        }
        address(_receivingWallet).transfer(ETHRequired);
        _transferPack(saleIndex, numPacks, to);

        emit BundleSold(saleId, msg.sender, numPacks, address(0), ETHRequired);
    }

    /**
     * @notice Buys Sand Bundle with DAI
     * @param saleId id of the bundle
     * @param numPacks the amount of packs to buy
     * @param to The address that will receive the SAND
     */
    function buyBundleWithDai(uint256 saleId, uint256 numPacks, address to) external {
        require(saleId > 0, "invalid saleId");
        uint256 saleIndex = saleId - 1;
        uint256 numPacksLeft = sales[saleIndex].numPacksLeft;
        require(numPacksLeft >= numPacks, "not enough packs on sale");
        sales[saleIndex].numPacksLeft = numPacksLeft - numPacks;

        uint256 USDRequired = numPacks.mul(sales[saleIndex].priceUSD);
        require(_dai.transferFrom(msg.sender, _receivingWallet, USDRequired), "failed to transfer dai");
        _transferPack(saleIndex, numPacks, to);

        emit BundleSold(saleId, msg.sender, numPacks, address(_dai), USDRequired);
    }

    function getSaleInfo(uint256 saleId) external view returns(uint256 priceUSD, uint256 numPacksLeft) {
        require(saleId > 0, "invalid saleId");
        uint256 saleIndex = saleId - 1;
        priceUSD = sales[saleIndex].priceUSD;
        numPacksLeft = sales[saleIndex].numPacksLeft;
    }

    function withdrawSale(uint256 saleId, address to) external onlyAdmin() {
        require(saleId > 0, "invalid saleId");
        uint256 saleIndex = saleId - 1;
        uint256 numPacksLeft = sales[saleIndex].numPacksLeft;
        sales[saleIndex].numPacksLeft = 0;

        uint256[] memory ids = sales[saleIndex].ids;
        uint256[] memory amounts = sales[saleIndex].amounts;
        uint256 numIds = ids.length;
        for (uint256 i = 0; i < numIds; i++) {
            amounts[i] = amounts[i].mul(numPacksLeft);
        }
        require(_sand.transferFrom(address(this), to, numPacksLeft.mul(sales[saleIndex].sandAmount)), "transfer fo Sand failed");
        _asset.safeBatchTransferFrom(address(this), to, ids, amounts, "");
    }

    /**
     * @notice Returns the amount of ETH for a specific amount of USD
     * @param usdAmount An amount of USD
     * @return The amount of ETH
     */
    function getEtherAmountWithUSD(uint256 usdAmount) public view returns (uint256) {
        uint256 ethUsdPair = getEthUsdPair();
        return usdAmount.mul(1000000000000000000).div(ethUsdPair);
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
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external returns (bytes4) {
        require(
            address(_asset) == msg.sender,
            "only accept asset as sender"
        );
        require(from == operator, "only self executed transfer allowed");
        require(value > 0, "no Asset transfered");
        require(data.length > 0, "data need to contains the sale data");

        (
            uint256 numPacks,
            uint256 sandAmountPerPack,
            uint256 priceUSDPerPack
        ) = abi.decode(data, (uint256, uint256, uint256));

        uint256 amount = value.div(numPacks);
        require(amount.mul(numPacks) == value, "invalid amounts, not divisible by numPacks");
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount;
        uint256[] memory ids = new uint256[](1);
        ids[0] = id;
        _setupBundle(from, sandAmountPerPack, numPacks, ids, amounts, priceUSDPerPack);
        return ERC1155_RECEIVED;
    }

    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external returns (bytes4) {
        require(
            address(_asset) == msg.sender,
            "only accept asset as sender"
        );
        require(from == operator, "only self executed transfer allowed");
        require(ids.length > 0, "need to contains Asset");
        require(data.length > 0, "data need to contains the sale data");

        (
            uint256 numPacks,
            uint256 sandAmountPerPack,
            uint256 priceUSDPerPack
        ) = abi.decode(data, (uint256, uint256, uint256));

        uint256[] memory amounts = new uint256[](ids.length); // TODO
        for(uint256 i = 0; i < amounts.length; i ++) {
            require(values[i] > 0, "asset transfer with zero values");
            uint256 amount = values[i].div(numPacks);
            require(amount.mul(numPacks) == values[i], "invalid amounts, not divisible by numPacks");
            amounts[i] = amount;
        }

        _setupBundle(from, sandAmountPerPack, numPacks, ids, amounts, priceUSDPerPack);
        return ERC1155_BATCH_RECEIVED;
    }

    function _setupBundle(
        address from,
        uint256 sandAmountPerPack,
        uint256 numPacks,
        uint256[] memory ids,
        uint256[] memory amounts,
        uint256 priceUSDPerPack
    ) internal {
        require(_sand.transferFrom(from, address(this), sandAmountPerPack.mul(numPacks)), "failed to transfer Sand");
        uint256 saleId = sales.push(Sale({
            ids: ids,
            amounts : amounts,
            sandAmount: sandAmountPerPack,
            priceUSD: priceUSDPerPack,
            numPacksLeft: numPacks
        }));
        emit BundleSale(saleId, ids, amounts, sandAmountPerPack, priceUSDPerPack, numPacks);
    }
}
