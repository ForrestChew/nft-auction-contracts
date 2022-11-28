const {
  loadFixture,
  mine,
} = require("@nomicfoundation/hardhat-network-helpers");
const { ethers } = require("hardhat");
const { expect } = require("chai");
const {
  contractFixtures,
  createSingleNftAndApproveAuction,
  createMultipleNftsAndApproveAuction,
  listMultipleNftsForAuction,
} = require("../fixtures");

describe("NftAuction", () => {
  let listingFee = ethers.utils.parseEther("0.1");
  describe("Deployment", () => {
    it("Deploys NftAuction smart contract", async () => {
      const { nftAuction } = await loadFixture(contractFixtures);
      expect(nftAuction.address.length).to.equal(42);
    });
    it("Sets the correct auction owner address", async () => {
      const { nftAuction, auctionOwner } = await loadFixture(contractFixtures);
      expect(await nftAuction.auctionOwner()).to.equal(auctionOwner.address);
    });
    it("Sets the correct auction listing fee", async () => {
      const { nftAuction } = await loadFixture(contractFixtures);
      expect(await nftAuction.listingFee()).to.equal(listingFee);
    });
    it("Sets the initial auction state", async () => {
      const { nftAuction } = await loadFixture(contractFixtures);
      const inactive = 0;
      expect(await nftAuction.auctionState()).to.equal(inactive);
    });
  });
  describe("Listing an Nft", () => {
    describe("Lists nft for auction", () => {
      let price;
      let randSigner;
      let nftFactAddr;
      let nftAuctionInstance;
      let currentNft;
      let nftFactoryInstance;
      beforeEach(async () => {
        const { nftAuction, nftFactory, randAccount_1 } = await loadFixture(
          createSingleNftAndApproveAuction
        );
        nftAuctionInstance = nftAuction;
        nftFactAddr = nftFactory.address;
        randSigner = randAccount_1;
        nftFactoryInstance = nftFactory;
        price = ethers.utils.parseEther("1");
        const tokenId = 1;
        await nftAuction
          .connect(randSigner)
          .listNft(nftFactAddr, tokenId, price, {
            value: listingFee,
          });
        currentNft = await nftAuction.getCurrentNft();
      });
      it("Sets listing ID to Nft ID 1", async () => {
        expect(currentNft[0][0]).to.equal(1);
      });
      it("Sets listing starting price to 1 ETH", async () => {
        expect(currentNft[0][1]).to.equal(price);
      });
      it("Sets listing startingTime to current block time", async () => {
        expect(currentNft[0][2]).to.be.greaterThan(0);
      });
      it("Sets listing isAuctioning boolean to false", async () => {
        expect(currentNft[0][3]).to.equal(false);
      });
      it("Sets listing token factory addr to Nft collection addr", async () => {
        expect(currentNft[0][4]).to.equal(nftFactAddr);
      });
      it("Sets listing token seller addr to Nft lister", async () => {
        expect(currentNft[0][5]).to.equal(randSigner.address);
      });
      it("Sets listing owner addr to Nft auction contract", async () => {
        expect(currentNft[0][6]).to.equal(nftAuctionInstance.address);
      });
      it("Transfers ownership of nft from lister to auction smart contract", async () => {
        const tokenId = 1;
        expect(await nftFactoryInstance.ownerOf(tokenId)).to.equal(
          nftAuctionInstance.address
        );
      });
    });
    describe("Lists Nft for auction reverts", () => {
      let nftAuctionInstance;
      let nftFactoryInstance;
      let nftId;
      let randSigner;
      beforeEach(async () => {
        const { nftFactory, nftAuction, randAccount_1, tokenId } =
          await loadFixture(createSingleNftAndApproveAuction);
        nftAuctionInstance = nftAuction;
        nftFactoryInstance = nftFactory;
        randSigner = randAccount_1;
        nftId = tokenId;
      });
      it("Reverts when incorrect listing fee is used", async () => {
        const incorrectFee = ethers.utils.parseEther("2");
        const price = ethers.utils.parseEther("1");
        await expect(
          nftAuctionInstance
            .connect(randSigner)
            .listNft(nftAuctionInstance.address, nftId, price, {
              value: incorrectFee,
            })
        ).to.be.revertedWith("listNft: Incorrect amount");
      });
      it("Reverts when auction is active", async () => {
        const price = ethers.utils.parseEther("1");
        const tokenUri_2 = "https://pinata.some_uri_2";
        await nftFactoryInstance
          .connect(randSigner)
          .createCollectable(tokenUri_2);
        await nftAuctionInstance
          .connect(randSigner)
          .listNft(nftFactoryInstance.address, nftId, price, {
            value: listingFee,
          });
        await nftAuctionInstance.startAuction();
        const secondTokenId = 2;
        await expect(
          nftAuctionInstance
            .connect(randSigner)
            .listNft(nftFactoryInstance.address, secondTokenId, price, {
              value: listingFee,
            })
        ).to.be.revertedWith("Auction must be INACTIVE");
      });
    });
    it("Lists multiple Nfts for auction", async () => {
      const { nftAuction, nftFactory, randAccount_1 } = await loadFixture(
        createMultipleNftsAndApproveAuction
      );
      const price = ethers.utils.parseEther("1");
      const listingFee = ethers.utils.parseEther("0.1");
      for (let i = 0; i < 3; i++) {
        const tokenId = i + 1;
        await nftAuction
          .connect(randAccount_1)
          .listNft(nftFactory.address, tokenId, price, {
            value: listingFee,
          });
      }
      const nftListings = await nftAuction.getAllListings();
      expect(nftListings.length).to.equal(3);
    });
  });
  describe("Delisting an Nft", () => {
    it("Removes individual Nft listing from anywhere in stack", async () => {
      const { nftAuction, nftFactory, randAccount_1 } = await loadFixture(
        listMultipleNftsForAuction
      );
      const nftListingsBeforeDelist = await nftAuction.getAllListings();
      expect(nftListingsBeforeDelist.length).to.equal(3);
      const secondListingNodeKey = nftListingsBeforeDelist[1].key;
      await nftAuction
        .connect(randAccount_1)
        .delistNft(nftFactory.address, secondListingNodeKey);
      const nftListingsAfterDelist = await nftAuction.getAllListings();
      expect(nftListingsAfterDelist.length).to.equal(2);
    });
    it("Removes individual Nft listings and reasigns next and prev keys", async () => {
      const { nftAuction, nftFactory, randAccount_1 } = await loadFixture(
        listMultipleNftsForAuction
      );
      const nftListingsBeforeDelist = await nftAuction.getAllListings();
      const firstListingNextKey = nftListingsBeforeDelist[0].next;
      const firstListingKey = nftListingsBeforeDelist[0].key;
      const secondListingKey = nftListingsBeforeDelist[1].key;
      const thirdListingKey = nftListingsBeforeDelist[2].key;
      expect(firstListingNextKey).to.equal(secondListingKey);
      await nftAuction
        .connect(randAccount_1)
        .delistNft(nftFactory.address, secondListingKey);
      const nftListingsAfterDelist = await nftAuction.getAllListings();
      expect(nftListingsAfterDelist[0].next).to.equal(thirdListingKey);
      expect(nftListingsAfterDelist[1].prev).to.equal(firstListingKey);
    });
  });
  describe("Starting Auction", () => {
    let nftAuctionInstance;
    let nftFactoryInstance;
    let randSigner;
    beforeEach(async () => {
      const { nftAuction, nftFactory, randAccount_1 } = await loadFixture(
        listMultipleNftsForAuction
      );
      await nftAuction.startAuction();
      nftAuctionInstance = nftAuction;
      nftFactoryInstance = nftFactory;
      randSigner = randAccount_1;
    });
    it("Sets auction state to ACTIVE", async () => {
      const active = 1;
      expect(await nftAuctionInstance.auctionState()).to.equal(active);
    });
    it("Sets isAuctioning to true for the first listing", async () => {
      const currentNft = await nftAuctionInstance.getCurrentNft();
      const tokenId = 3;
      expect(currentNft[0][0]).to.equal(tokenId);
      expect(currentNft[0][3]).to.equal(true);
    });
    describe("Auction Cycle", () => {
      it("Sets the next Nft for auction", async () => {
        expect(await nftAuctionInstance.stackSize()).to.equal(3);
        await mine(1000);
        await nftAuctionInstance.auctionNextNft();
        const currentNft = await nftAuctionInstance.getCurrentNft();
        expect(await nftAuctionInstance.stackSize()).to.equal(2);
        const tokenId = 2;
        expect(currentNft[0][0]).to.equal(tokenId);
        expect(currentNft[0][3]).to.equal(true);
      });
      it("Transfers Nft back to seller if no one bids on it", async () => {
        await mine(1000);
        const tokenId = 3;
        expect(await nftFactoryInstance.ownerOf(tokenId)).to.equal(
          nftAuctionInstance.address
        );
        await nftAuctionInstance.auctionNextNft();
        expect(await nftFactoryInstance.ownerOf(tokenId)).to.equal(
          randSigner.address
        );
      });
    });
    describe("Auction Cycle Reverts", () => {
      it("Reverts setting the next Nft for auction when not enough time ellapses", async () => {
        const { nftAuction } = await loadFixture(listMultipleNftsForAuction);
        expect(await nftAuction.stackSize()).to.equal(3);
        await expect(nftAuction.auctionNextNft()).to.be.revertedWith(
          "auctionNextNft: Not enough time has ellapsed"
        );
      });
    });
  });
});
