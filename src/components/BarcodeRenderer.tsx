'use client';

import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeRendererProps {
  value: string;
  className?: string;
}

export function BarcodeRenderer({ value, className }: BarcodeRendererProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          width: 2,
          height: 50,
          displayValue: true,
          fontSize: 14,
          margin: 0,
          background: '#transparent',
          lineColor: '#000000',
        });
      } catch (err) {
        console.error('Failed to generate barcode:', err);
      }
    }
  }, [value]);

  return <svg ref={svgRef} className={className} />;
}
