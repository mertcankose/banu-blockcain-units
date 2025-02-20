// @ts-nocheck
import { createAppKit, useAppKitAccount, useAppKitProvider } from "@reown/appkit/react";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { mainnet, sepolia } from "@reown/appkit/networks";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { BrowserProvider } from "ethers";

/* WALLET KIT AYARLARI (HER WALLET PAKETİNE GÖRE DEĞİŞİKLİK GÖSTEREBİLİR) */
const projectId = "415b280d7f14fd394fac17ffed28e6db";

const metadata = {
  name: "banuchain-dapp",
  description: "Banuchain Dapp",
  url: "https://banuchain.com/",
  icons: ["https://banuchain.com/banuchain.png"],
};

createAppKit({
  adapters: [new EthersAdapter()],
  networks: [sepolia, mainnet],
  metadata,
  projectId,
  features: {
    analytics: true,
  },
});

const App = () => {
  // WALLET BİLGİLERİ
  const { walletProvider } = useAppKitProvider("eip155"); // provider tüm evm uyumlu blokzincirleri destekler
  const { address, isConnected } = useAppKitAccount();

  //  BALANCE
  const [unitsBalance, setUnitsBalance] = useState("0");

  const [provider, setProvider] = useState(null);

  useEffect(() => {
    if (isConnected && walletProvider) {
      const newProvider = new BrowserProvider(walletProvider);
      setProvider(newProvider);
    } else {
      setProvider(null);
    }
  }, [isConnected, walletProvider]);

  useEffect(() => {
    if (isConnected && provider) {
      fetchBalances();
    }
  }, [isConnected, provider, address]);

  const fetchBalances = async () => {
    try {
      if (!isConnected || !provider) return;
      const unitsBal = await provider.getBalance(address);

      setUnitsBalance(ethers.formatEther(unitsBal));
    } catch (err) {
      console.error("Balance fetch error:", err);
      setUnitsBalance("0");
    }
  };

  return (
    <div>
      <Button>Click me</Button>
      <appkit-button balance="show" label="Cüzdan Bağla" size="md" loadingLabel="Bağlanıyor.." />
    </div>
  );
};

export default App;
