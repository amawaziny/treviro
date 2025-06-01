"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useInvestments } from "@/hooks/use-investments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { AddInvestmentForm } from "@/components/investments/add-investment-form";
import type { RealEstateInvestment } from "@/lib/types";

export default function EditRealEstateInvestmentPage() {
  const router = useRouter();
  const params = useParams();
  const { investments, isLoading } = useInvestments();
  const [investment, setInvestment] = useState<RealEstateInvestment | null>(null);

  useEffect(() => {
    if (!params?.id) return;
    const found = investments.find(
      (inv) => inv.type === "Real Estate" && inv.id === params.id
    ) as RealEstateInvestment | undefined;
    if (found) {
      setInvestment(found);
    }
  }, [params?.id, investments]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        Loading investment...
      </div>
    );
  }

  if (!investment) {
    return (
      <Card className="max-w-xl mx-auto mt-10">
        <CardHeader>
          <CardTitle>Investment Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">
            The requested real estate investment could not be found.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-8">
      <AddInvestmentForm mode="edit" initialValues={investment} />
    </div>
  );
}
