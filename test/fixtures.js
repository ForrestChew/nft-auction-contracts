const { mine } = require("@nomicfoundation/hardhat-network-helpers");

const deployNftFactoryFixture = async () => {
  const [nftFactoryDeployer] = await ethers.getSigners();
  const NftFactory = await ethers.getContractFactory("NftFactory");
  const nftFactory = await NftFactory.deploy("TestToken", "TT");

  return { nftFactory, nftFactoryDeployer };
};

const deployNftAuctionFixture = async () => {
  const listingFee = ethers.utils.parseEther("0.1");
  const biddingFee = ethers.utils.parseEther("0.01");
  const [auctionOwner, randAccount_1] = await ethers.getSigners();
  const NftAuction = await ethers.getContractFactory("NftAuction");
  const nftAuction = await NftAuction.deploy(
    auctionOwner.address,
    listingFee,
    biddingFee
  );

  return { nftAuction, auctionOwner, randAccount_1 };
};

const contractFixtures = async () => {
  const { nftFactory, nftFactoryDeployer } = await deployNftFactoryFixture();
  const { nftAuction, auctionOwner, randAccount_1 } =
    await deployNftAuctionFixture();

  return {
    nftFactory,
    nftFactoryDeployer,
    nftAuction,
    auctionOwner,
    randAccount_1,
  };
};

const createNftAndApproveAuction = async (
  signer,
  nftAuction,
  nftFactory,
  tokenId,
  tokenUri
) => {
  await nftFactory.connect(signer).createCollectable(tokenUri);
  await nftFactory.connect(signer).approve(nftAuction.address, tokenId);
};

const createSingleNftAndApproveAuction = async () => {
  const { nftAuction, nftFactory, randAccount_1 } = await contractFixtures();
  const tokenUri = "https://testtokenuri.uri";
  const tokenId = 1;
  await createNftAndApproveAuction(
    randAccount_1,
    nftAuction,
    nftFactory,
    tokenId,
    tokenUri
  );

  return { nftFactory, nftAuction, randAccount_1, tokenId };
};

const createMultipleNftsAndApproveAuction = async () => {
  const { nftAuction, nftFactory, randAccount_1 } = await contractFixtures();
  const tokenUri = "https://testtokenuri.uri";
  for (let i = 0; i < 5; i++) {
    const tokenId = i + 1;
    await createNftAndApproveAuction(
      randAccount_1,
      nftAuction,
      nftFactory,
      tokenId,
      tokenUri
    );
  }
  return { nftFactory, nftAuction, randAccount_1 };
};

const listNftToAuction = async (signer, nftAuction, nftFactory, tokenId) => {
  const startingPrice = ethers.utils.parseEther("1");
  const listingFee = ethers.utils.parseEther("0.1");
  await nftAuction
    .connect(signer)
    .listNft(nftFactory.address, tokenId, startingPrice, { value: listingFee });
};

const listMultipleNftsForAuction = async () => {
  const { nftAuction, nftFactory, randAccount_1 } =
    await createMultipleNftsAndApproveAuction();
  for (let i = 0; i < 3; i++) {
    const tokenId = i + 1;
    await listNftToAuction(randAccount_1, nftAuction, nftFactory, tokenId);
  }

  return { nftAuction, nftFactory, randAccount_1 };
};

const buyNftAtAuction = async () => {
  const { nftFactory, nftAuction, randAccount_1, tokenId } =
    await createSingleNftAndApproveAuction();
  await listNftToAuction(randAccount_1, nftAuction, nftFactory, tokenId);
  await nftAuction.startAuction();
  const bidAmount = ethers.utils.parseEther("2");
  const bidFee = ethers.utils.parseEther("0.01");
  await nftAuction.bidOnNft(bidAmount, { value: bidFee });
  await mine(1000);
  await nftAuction.auctionNextNft();
  const soldItemKeyArr = await nftAuction.getPostBidItemKeys();

  return { nftAuction, nftFactory, randAccount_1, soldItemKeyArr };
};

module.exports = {
  deployNftFactoryFixture,
  deployNftAuctionFixture,
  contractFixtures,
  createSingleNftAndApproveAuction,
  createMultipleNftsAndApproveAuction,
  listMultipleNftsForAuction,
  buyNftAtAuction,
};
