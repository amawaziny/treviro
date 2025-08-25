import React from "react";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { useLanguage } from "@/contexts/language-context";
import { getCurrentDate } from "@/lib/utils";

export interface RenderCurrencyFieldsProps {
  control: any;
  isDedicatedCurrencyMode?: boolean;
}

const RenderCurrencyFieldsComponent: React.FC<RenderCurrencyFieldsProps> = ({
  control,
  isDedicatedCurrencyMode,
}) => {
  const { t, dir } = useLanguage();
  return (
    <div className="space-y-6 mt-6 p-6 border rounded-md">
      <h3 className="text-lg font-medium text-primary">
        {t("currency_investment_details")}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {!isDedicatedCurrencyMode && (
          <FormField
            control={control}
            name="name"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>{t("name_description_optional")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("e.g., USD Savings or EUR Emergency Fund")}
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={control}
          name="currencyCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("transaction_currency_code")}</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., USD, EUR"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="foreignCurrencyAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("foreign_currency_amount")}</FormLabel>
              <FormControl>
                <NumericInput
                  placeholder="e.g., 1000.50"
                  value={
                    field.value !== undefined ? String(field.value) : undefined
                  }
                  onChange={field.onChange}
                  allowDecimal={true}
                />
              </FormControl>
              <FormDescription>
                {t("amount_of_the_foreign_currency_you_bought")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="exchangeRateAtPurchase"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("exchange_rate_at_purchase_to_egp")}</FormLabel>
              <FormControl>
                <NumericInput
                  placeholder="e.g., 30.85 (for USD to EGP)"
                  value={
                    field.value !== undefined ? String(field.value) : undefined
                  }
                  onChange={field.onChange}
                  allowDecimal={true}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="purchaseDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("purchase_date")}</FormLabel>
              <FormControl>
                <Input
                  dir={dir}
                  type="date"
                  {...field}
                  value={field.value || getCurrentDate()}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};

export const MemoizedRenderCurrencyFields = React.memo(
  RenderCurrencyFieldsComponent,
);
