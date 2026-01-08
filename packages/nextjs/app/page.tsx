import Link from "next/link";
import Image from "next/image";
import { ConnectedAddress } from "~~/components/ConnectedAddress";
import { MintWBTCForm, SetOraclePriceForm, HealthFactorCard, DepositForm, BorrowForm, RepayForm, WithdrawForm, ProtocolStats } from "~~/components/btcfi";

const Home = () => {
  return (
    <div className="flex items-center flex-col grow pt-10">
      <div className="px-5">
        <h1 className="text-center">
          <span className="block text-2xl mb-4">Welcome to</span>
          <Image 
            src="/logo-horizontal.svg" 
            alt="BTCFi Lending Protocol" 
            width={400} 
            height={100} 
            className="mx-auto"
          />
        </h1>
        <ConnectedAddress />
        <p className="text-center text-lg mt-4">
          Deposit Bitcoin (wBTC) as collateral and borrow stablecoins.
          <br />
          Built on Starknet with Cairo smart contracts.
        </p>
        <p className="text-center text-sm mt-2 opacity-70">
          Powered by decentralized oracles and automated liquidations
        </p>
      </div>

      {/* Oracle Price Section */}
      <div className="w-full max-w-7xl px-5 mt-8">
        {/* SetOraclePriceForm removed - using real Pragma Oracle */}
      </div>

      {/* Protocol Stats Section */}
      <div className="w-full max-w-7xl px-5 mt-8">
        <ProtocolStats />
      </div>

      {/* Main Interaction Section - 4 Columns */}
      <div className="w-full max-w-7xl px-5 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Column 1: Mint wBTC */}
          <div className="lg:col-span-1">
            <MintWBTCForm />
          </div>

          {/* Column 2: Deposit & Withdraw */}
          <div className="lg:col-span-1 space-y-6">
            <DepositForm />
            <WithdrawForm />
          </div>

          {/* Column 3: Borrow & Repay */}
          <div className="lg:col-span-1 space-y-6">
            <BorrowForm />
            <RepayForm />
          </div>

          {/* Column 4: Health Factor */}
          <div className="lg:col-span-1">
            <HealthFactorCard />
          </div>
        </div>
      </div>

    </div>
  );
};

export default Home;
