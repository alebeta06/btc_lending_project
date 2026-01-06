// components/btcfi/OraclePriceInfo.tsx
// Componente para mostrar información del precio del oracle con advertencia de testnet

import React from "react";

interface OraclePriceInfoProps {
  price: string;
  showDetails?: boolean;
}

export function OraclePriceInfo({
  price,
  showDetails = true,
}: OraclePriceInfoProps) {
  // Precio real actual de BTC desde Alchemy (actualizado: 5 de enero de 2026, 21:17 UTC)
  const realPrice = "93,992";
  const realPriceDate = "5 de enero de 2026";
  const difference = "+19%";

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-yellow-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800">
            Testnet Oracle Price
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>
              Este precio (<strong>${price}</strong>) proviene de{" "}
              <strong>Pragma Oracle</strong> en Sepolia testnet.
            </p>
            {showDetails && (
              <>
                <p className="mt-2">
                  Los datos de testnet no se actualizan frecuentemente
                  (actualmente tienen 85 días). El precio real de BTC al{" "}
                  <strong>{realPriceDate}</strong> es aproximadamente{" "}
                  <strong>${realPrice}</strong> (diferencia: {difference}).
                </p>
                <p className="mt-2 text-xs">
                  💡 <strong>En mainnet</strong>, Pragma proporciona precios en
                  tiempo real actualizados cada segundo.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Versión compacta para tooltip
export function OraclePriceTooltip() {
  return (
    <div
      className="inline-flex items-center gap-1 text-xs text-yellow-600 cursor-help"
      title="Testnet price - not real-time"
    >
      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
          clipRule="evenodd"
        />
      </svg>
      <span>Testnet</span>
    </div>
  );
}
