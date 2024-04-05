import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Treasury", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployeFixture() {
    // Contracts are deployed using the first signer/account by default
    const accounts = await ethers.getSigners();
    const owner = accounts[0];
    const admin = accounts[1];
    const proxy = accounts[2];
    const decimals = 6;

    const StableToken = await ethers.getContractFactory("StableToken");
    const stableToken = await StableToken.deploy(decimals);
    const Treasury = await ethers.getContractFactory("Treasury");
    const treasury = await Treasury.deploy(admin.address);

    return { stableToken, treasury, accounts, owner, admin, proxy };
  }

  describe("Deployment", function () {
    it("Should set the Role ADMIN to owner  ", async function () {
      const { stableToken, treasury, accounts, owner, admin, proxy } =
        await deployeFixture();
      const ADMIN = await treasury.DEFAULT_ADMIN_ROLE();
      expect(await treasury.hasRole(ADMIN, admin.address)).to.equal(true);
    });
  });

  describe("recieve", function () {
    it("Should recieve ETHER", async function () {
      const { stableToken, treasury, accounts, owner, proxy } =
        await deployeFixture();
      const sender = accounts[2];
      const value = ethers.utils.parseEther("1.5");
      await sender.sendTransaction({ to: treasury.address, value });
      expect(await ethers.provider.getBalance(treasury.address)).to.equal(
        value
      );
    });
  });
  describe("sendTo", function () {
    it("Should revert when the caller is not the proxy  ", async function () {
      const { stableToken, treasury, accounts, owner, proxy } =
        await deployeFixture();
      const to = accounts[2].address;
      const amount = 1_000_000_000000_000_000n;
      const asset = "0x0000000000000000000000000000000000000000";
      await expect(treasury.connect(proxy).sendTo(to, amount, asset)).to.be
        .revertedWith;
    });

    it("Should send ether", async function () {
      const { stableToken, treasury, accounts, owner, admin, proxy } =
        await deployeFixture();
      const PROXY = await treasury.WITHDRAWER();
      const sender = accounts[2];
      const value = ethers.utils.parseEther("1.5");
      const to = accounts[3].address;
      await sender.sendTransaction({ to: treasury.address, value });
      const asset = "0x0000000000000000000000000000000000000000";
      const toBalance = await ethers.provider.getBalance(to);
      await treasury.connect(admin).grantRole(PROXY, proxy.address);
      await treasury.connect(proxy).sendTo(to, value, asset);
      expect(await ethers.provider.getBalance(treasury.address)).to.equal(0);
      expect(await ethers.provider.getBalance(to)).to.equal(
        toBalance.add(value)
      );
    });

    it("Should send ERC20", async function () {
      const { stableToken, treasury, accounts, owner, admin, proxy } =
        await deployeFixture();
      const PROXY = await treasury.WITHDRAWER();
      const sender = accounts[2];
      const value0 = 20_000_000_000n;
      const value1 = 20_000_000_000_000_000_000_000n;
      const to = accounts[3].address;
      await stableToken.connect(owner).mint(treasury.address, value0);
      expect(await stableToken.balanceOf(treasury.address)).to.equal(value0);
      await treasury.connect(admin).grantRole(PROXY, proxy.address);
      await treasury.connect(proxy).sendTo(to, value1, stableToken.address);
      expect(await stableToken.balanceOf(treasury.address)).to.equal(0);
      expect(await stableToken.balanceOf(to)).to.equal(value0);
    });

    it("Should emit the event SendTo", async function () {
      const { stableToken, treasury, accounts, owner, admin, proxy } =
        await deployeFixture();
      const PROXY = await treasury.WITHDRAWER();
      const sender = accounts[2];
      const value0 = 20_000_000_000n;
      const value1 = 20_000_000_000_000_000_000_000n;
      const to = accounts[3].address;
      await stableToken.connect(owner).mint(treasury.address, value0);
      expect(await stableToken.balanceOf(treasury.address)).to.equal(value0);
      await treasury.connect(admin).grantRole(PROXY, proxy.address);
      await expect(
        treasury.connect(proxy).sendTo(to, value1, stableToken.address)
      )
        .to.emit(treasury, "SendTo")
        .withArgs(to, value1, stableToken.address);
    });
  });
});
