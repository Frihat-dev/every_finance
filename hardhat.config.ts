import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";



module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
};