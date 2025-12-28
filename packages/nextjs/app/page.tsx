import Link from "next/link";
import Image from "next/image";
import { ConnectedAddress } from "~~/components/ConnectedAddress";
import { HealthFactorCard, DepositForm, BorrowForm, ProtocolStats } from "~~/components/btcfi";

const Home = () => {
  return (
    <div className="flex items-center flex-col grow pt-10">
      <div className="px-5">
        <h1 className="text-center">
          <span className="block text-2xl mb-2">Welcome to</span>
          <span className="block text-4xl font-bold">BTCFi Lending Protocol</span>
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

      {/* Protocol Stats Section */}
      <div className="w-full max-w-7xl px-5 mt-8">
        <ProtocolStats />
      </div>

      {/* Main Interaction Section */}
      <div className="w-full max-w-7xl px-5 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Deposit & Borrow */}
          <div className="space-y-6">
            <DepositForm />
            <BorrowForm />
          </div>

          {/* Right Column: Health Factor */}
          <div>
            <HealthFactorCard />
          </div>
        </div>
      </div>

      {/* Info Cards Section */}
      <div className="bg-container grow w-full mt-16 px-8 py-12">
        <div className="flex justify-center items-center gap-12 flex-col sm:flex-row">
          <div className="flex flex-col bg-base-100 relative text-[12px] px-10 py-10 text-center items-center max-w-xs rounded-3xl border border-gradient">
            <div className="trapeze"></div>
            <Image
              src="/debug-icon.svg"
              alt="icon"
              width={26}
              height={30}
            ></Image>
            <p>
              Interact with your BTCFi Lending contracts using the{" "}
              <Link href="/debug" passHref className="link">
                Debug Contracts
              </Link>{" "}
              tab. Test deposits, borrows, and liquidations.
            </p>
          </div>
          <div className="flex flex-col bg-base-100 relative text-[12px] px-10 py-10 text-center items-center max-w-xs rounded-3xl border border-gradient">
            <div className="trapeze"></div>
            <Image
              src="/explorer-icon.svg"
              alt="icon"
              width={20}
              height={32}
            ></Image>
            <p>
              View your collateral, debt, and Health Factor in real-time.
              Monitor the protocol&apos;s TVL and active positions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
