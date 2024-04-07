import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";
import { staking } from "../typechain-types/contracts";

describe("StakingToken", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployeFixture() {
    // Contracts are deployed using the first signer/account by default
    const accounts = await ethers.getSigners();
    const owner = accounts[0];
    const staker1 = accounts[1];
    const staker2 = accounts[2];
    const treasury = accounts[3];
    
    const Alpha = await ethers.getContractFactory("StableToken");
    const alpha = await Alpha.deploy(18);

    const Form = await ethers.getContractFactory("StableToken");
    const form = await Form.deploy(18);

    const StakingToken = await ethers.getContractFactory("StakingToken");
    const stakingToken = await StakingToken.deploy(alpha.target, form.target, treasury.address);

    return {
      alpha, 
      form,
      stakingToken,
      owner,
      treasury,
      staker1,
      staker2
    };
  }

  describe("functions", function () {
    it("functions  ", async function () {
      const {
      alpha, 
      form,
      stakingToken,
      owner,
      treasury,
      staker1,
      staker2,
      } = await deployeFixture();

     await alpha.mint(staker1.address, ethers.parseUnits("10000","ether"));
     await form.mint(staker1.address, ethers.parseUnits("10000","ether"));
     await form.mint(owner.address, ethers.parseUnits("3000000","ether"));

     await alpha.connect(staker1).approve(stakingToken.target, ethers.parseUnits("10000","ether"));
     await form.connect(staker1).approve(stakingToken.target, ethers.parseUnits("10000","ether"));
     await form.connect(owner).approve(stakingToken.target, ethers.parseUnits("3000000","ether"));
     await form.connect(treasury).approve(stakingToken.target, ethers.parseUnits("3000000","ether"))
     
      const rewardDuration = 3 * 24 * 60 * 60;
      const minBoostingFactor = ethers.parseUnits("0.3","ether");
      const minTotalSupply = 100; 
      const minRatio = ethers.parseUnits("0.15","ether");
      const idealAmount = ethers.parseUnits("10000","ether");
      const minRatio2 = ethers.parseUnits("0.1","ether");
      const idealAmount2 = ethers.parseUnits("20000","ether");

     await stakingToken.connect(owner).addPack(form.target, ethers.parseUnits("1000000","ether"), rewardDuration, minBoostingFactor,
     minBoostingFactor, minRatio, idealAmount); 
     await stakingToken.connect(owner).addPack(form.target, ethers.parseUnits("1000000","ether"), rewardDuration, minBoostingFactor,
     minBoostingFactor, minRatio2, idealAmount2); 
    await stakingToken.connect(staker1).stake( ethers.parseUnits("1000","ether"), ethers.parseUnits("10000","ether"), staker1.address);
    await stakingToken.connect(staker1).unstake( ethers.parseUnits("500","ether"), ethers.parseUnits("500","ether"), staker1.address);
    await stakingToken.connect(staker1).claim(staker1.address);
    await stakingToken.connect(staker1).exit(staker1.address);
    
    await stakingToken.connect(owner).notifyRewardAmount(0, ethers.parseUnits("1000000","ether"), rewardDuration);
  });

});


});
