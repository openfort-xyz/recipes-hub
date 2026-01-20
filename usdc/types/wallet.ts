import { ConnectedEmbeddedEthereumWallet } from "@openfort/react-native";

export type UserWallet = ConnectedEmbeddedEthereumWallet;

export interface WalletData {
  address: string;
  balance: string;
  wallet?: UserWallet;
}


