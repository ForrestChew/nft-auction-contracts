// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract AuctionItemFactory {
    struct AuctionItem {
        uint256 tokenId;
        uint256 price;
        uint256 startTime;
        bool isAuctioning;
        address tokenFactAddr;
        address seller;
        address owner;
    }

    /*
     * @notice - Creates an Nft listing (AuctionItem) by bundling
     * together fields that enable users to bid on the Nft.
     * @param _tokenFactAddr - Contract address to Nft ID belongs.
     * @param _tokenId - Nft ID.
     * @param _startingPrice - Price to begin bidding on Nft.
     * @return - The created Auction Item.
     */
    function _createItem(
        address _tokenFactAddr,
        uint256 _tokenId,
        uint256 _price
    ) internal view returns (AuctionItem memory) {
        return (
            AuctionItem({
                tokenId: _tokenId,
                price: _price,
                startTime: block.timestamp,
                isAuctioning: false,
                tokenFactAddr: _tokenFactAddr,
                seller: msg.sender,
                owner: address(this)
            })
        );
    }
}
