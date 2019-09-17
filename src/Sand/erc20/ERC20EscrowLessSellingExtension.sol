pragma solidity 0.5.9;

contract ERC20EscrowLessSellingExtension {
    mapping(address => mapping(uint256 => uint256)) sandClaimed;

    function claimSellerOffer(
        address _buyer,
        uint256 _offerId,
        address payable _seller,
        address _tokenContract,
        uint256 _buyAmount,
        bytes calldata _signature
    ) external payable {
        require(
            msg.sender == _buyer || msg.sender == address(_tokenContract),
            "invalid buyer"
        ); //this assume tokenContract is safe

        require(
            sandClaimed[_seller][_offerId] >= _buyAmount,
            "not enough sand left"
        );
        // require(seller == recover(token, auctionData, ids, amounts, signature), "Signature mismatches");
        // TODO ...
    }
}
