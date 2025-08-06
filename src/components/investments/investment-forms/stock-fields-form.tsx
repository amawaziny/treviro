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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/language-context";
import { getCurrentDate, formatCurrencyWithCommas } from "@/lib/utils";
import type { ListedSecurity } from "@/lib/types";

export interface RenderStockFieldsProps {
  control: any;
  preSelectedSecurityDetails: ListedSecurity | null;
  listedSecurities: ListedSecurity[];
  isLoadingListedSecurities: boolean;
  listedSecuritiesError: Error | null;
  onSecuritySelect: (value: string) => void;
  isPreSelectedStockMode: boolean;
}

const RenderStockFieldsComponent: React.FC<RenderStockFieldsProps> = ({
  control,
  preSelectedSecurityDetails,
  listedSecurities,
  isLoadingListedSecurities,
  listedSecuritiesError,
  onSecuritySelect,
  isPreSelectedStockMode,
}) => {
  const { t, language, dir } = useLanguage();
  return (
    <div className="space-y-6 mt-6 p-6 border rounded-md">
      <h3 className="text-lg font-medium text-primary">
        {preSelectedSecurityDetails?.securityType === "Fund"
          ? t("fund_purchase_details")
          : t("stock_purchase_details")}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        {!isPreSelectedStockMode && (
          <FormField
            control={control}
            name="selectedsecurityId"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>{t("select_security_stock_or_fund")}</FormLabel>
                <Select
                  dir={dir}
                  onValueChange={(value) => {
                    field.onChange(value);
                    onSecuritySelect(value);
                  }}
                  value={field.value || ""}
                  disabled={
                    isLoadingListedSecurities ||
                    !!listedSecuritiesError ||
                    listedSecurities.length === 0
                  }
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          isLoadingListedSecurities
                            ? t("loading_securities")
                            : listedSecuritiesError
                            ? t("error_loading_securities")
                            : listedSecurities.length === 0
                            ? t("no_securities_available")
                            : t("select_a_security_from_the_list")
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {listedSecurities.map((security) => (
                      <SelectItem key={security.id} value={security.id}>
                        {security[language === "ar" ? "name_ar" : "name"]} (
                        {security.symbol}) -{" "}
                        {security.securityType === "Fund"
                          ? security.fundType
                          : security.market}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        {preSelectedSecurityDetails && (
          <div className="md:col-span-2 p-3 bg-muted/50 rounded-md">
            <p className="text-sm font-medium">
              {`${t("selected_security")}: ${preSelectedSecurityDetails[language === "ar" ? "name_ar" : "name"]} (${preSelectedSecurityDetails.symbol})`}
            </p>
            <p className="text-xs text-muted-foreground">
              {`${t("current_market_price")}: ${formatCurrencyWithCommas(preSelectedSecurityDetails.price)}`}
            </p>
            {preSelectedSecurityDetails.securityType === "Fund" &&
              preSelectedSecurityDetails.fundType && (
                <p className="text-xs text-muted-foreground">
                  {`${t("type")}: ${preSelectedSecurityDetails.fundType}`}
                </p>
              )}
          </div>
        )}
        <FormField
          control={control}
          name="numberOfShares"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("number_of_securities")}</FormLabel>
              <FormControl>
                <NumericInput
                  data-testid="shares-input"
                  placeholder="e.g., 100"
                  value={
                    field.value !== undefined ? String(field.value) : undefined
                  }
                  onChange={field.onChange}
                  allowDecimal={false}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="purchasePricePerShare"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("purchase_price_per_security")}</FormLabel>
              <FormControl>
                <NumericInput
                  data-testid="purchase-price-input"
                  placeholder="e.g., 150.50"
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
          name="purchaseFees"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("purchase_fees_optional")}</FormLabel>
              <FormControl>
                <NumericInput
                  data-testid="fees-input"
                  placeholder="e.g., 5.00"
                  value={field.value}
                  onChange={field.onChange}
                  allowDecimal={true}
                />
              </FormControl>
              <FormDescription>
                {t("brokerage_or_transaction_fees_for_this_purchase")}
              </FormDescription>
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
                  data-testid="purchase-date-input"
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

export const MemoizedRenderStockFields = React.memo(RenderStockFieldsComponent);
