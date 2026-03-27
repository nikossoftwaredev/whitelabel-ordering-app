"use client";

import Image from "next/image";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TableQrGeneratorProps {
  locale?: string;
}

export function TableQrGenerator({ locale = "el" }: TableQrGeneratorProps) {
  const [tableCount, setTableCount] = useState(10);

  const getOrderUrl = (tableNumber: number) => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    return `${base}/${locale}/order?table=${tableNumber}`;
  };

  const getQrUrl = (tableNumber: number) => {
    const orderUrl = encodeURIComponent(getOrderUrl(tableNumber));
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${orderUrl}`;
  };

  const handlePrintAll = () => {
    window.print();
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Label htmlFor="table-count">Number of tables</Label>
          <Input
            id="table-count"
            type="number"
            min={1}
            max={50}
            value={tableCount}
            onChange={(e) => setTableCount(parseInt(e.target.value) || 1)}
            className="w-20"
          />
        </div>
        <Button onClick={handlePrintAll} variant="outline">
          Print All QR Codes
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {Array.from({ length: tableCount }, (_, i) => i + 1).map((n) => (
          <Card key={n} className="text-center">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Table {n}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-2">
              <Image
                src={getQrUrl(n)}
                alt={`QR code for table ${n}`}
                width={150}
                height={150}
                unoptimized
              />
              <a
                href={getOrderUrl(n)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:underline truncate max-w-full"
              >
                View URL
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
