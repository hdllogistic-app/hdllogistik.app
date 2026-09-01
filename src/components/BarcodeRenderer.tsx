'use client';

import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeRendererProps {
  value: string;
  className?: string;
  width?: number;
  height?: number;
  fontSize?: number;
  margin?: number;
  showText?: boolean;
}

export function BarcodeRenderer({
  value,
  className,
  width = 3,
  height = 100,
  fontSize = 24,
  margin = 20,
  showText = true,
}: BarcodeRendererProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value.trim(), {
          format: 'CODE128',
          width,
          height,
          displayValue: showText,
          fontSize,
          font: 'monospace',
          textMargin: 8,
          margin,
          background: '#FFFFFF',
          lineColor: '#000000',
          flat: true,
        });
      } catch (err) {
        console.error('Failed to generate CODE128 barcode:', err);
      }
    }
  }, [value, width, height, fontSize, margin, showText]);

  return <svg ref={svgRef} className={className} />;
}
