"use client";

import { AddPriceHistoryForm } from "@/components/securities/add-price-history-form";
import { useAuth } from "@/hooks/use-auth";
import { useAdmin } from "@/hooks/use-admin";
import { useListedSecurities } from "@/hooks/use-listed-securities";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export default function AddPriceHistoryPage() {
  const { isAuthenticated } = useAuth();
  const { isAdmin, isLoading } = useAdmin();
  const router = useRouter();
  const { addPriceHistory } = useListedSecurities();
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated && !isAdmin && !isLoading) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, isAdmin, router]);

  const handleSubmit = async (values: {
    securityId: string;
    price: string;
  }) => {
    try {
      await addPriceHistory(values.securityId, parseFloat(values.price));
      toast({
        title: "Success",
        description: "Price history added successfully",
      });
      // router.push("/securities");
    } catch (error) {
      console.error("Error submitting price history:", error);
      toast({
        title: "Error",
        description: "Failed to add price history",
        variant: "destructive",
      });
    }
  };

  // render nothing until auth status resolves
  if (!isAuthenticated || !isAdmin || isLoading) return null;

  return <AddPriceHistoryForm onSubmit={handleSubmit} />;
}
