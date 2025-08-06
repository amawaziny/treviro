import React from "react";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import {
  FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { debtSubTypes } from "@/lib/schemas";
import { useLanguage } from "@/contexts/language-context";
import { getCurrentDate } from "@/lib/utils";

export interface RenderDebtFieldsProps {
  control: any;
  setValue: any;
  watch: any;
  isEditMode: boolean;
}

const RenderDebtFieldsComponent: React.FC<RenderDebtFieldsProps> = ({ control, setValue, watch, isEditMode }) => {
  const { t, dir } = useLanguage();
  const watchedDebtSubType = watch("debtSubType");
  return (
    <div className="space-y-6 mt-6 p-6 border rounded-md">
      <h3 className="text-lg font-medium text-primary">{t("debt_instrument_details")}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField control={control} name="debtSubType" render={({ field }) => (
          <FormItem>
            <FormLabel>{t("specific_debt_type")}</FormLabel>
            <Select disabled={isEditMode} dir={dir} onValueChange={field.onChange} value={field.value || ""} required data-testid="debt-type-select">
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={t("Select the type of debt")} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {debtSubTypes.map((dType) => (
                  <SelectItem key={dType} value={dType}>{t(dType)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={control} name="issuer" render={({ field }) => (
          <FormItem>
            <FormLabel>{t("issuer_institution")}</FormLabel>
            <FormControl>
              <Input data-testid="issuer-input" placeholder={t("e.g., US Treasury, XYZ Corp")}{...field} value={field.value || ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={control} name="purchaseDate" render={({ field }) => (
          <FormItem>
            <FormLabel>{t("purchase_date")}</FormLabel>
            <FormControl>
              <Input data-testid="purchase-date-input" dir={dir} type="date" {...field} value={field.value || getCurrentDate()} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={control} name="maturityDate" render={({ field }) => (
          <FormItem>
            <FormLabel>{t("maturity_date")}</FormLabel>
            <FormControl>
              <Input data-testid="expiry-date-input" type="date" dir={dir} {...field} value={field.value || ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={control} name="amountInvested" render={({ field }) => (
          <FormItem>
            <FormLabel>{t("total_amount_invested_cost")}</FormLabel>
            <FormControl>
              <NumericInput data-testid="total-cost-input" placeholder="e.g., 10000.75" value={field.value} onChange={field.onChange} allowDecimal={true} />
            </FormControl>
            <FormDescription>{t("total_cost_including_any_fees")}</FormDescription>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={control} name="interestRate" render={({ field }) => {
          const value = field.value !== undefined ? String(field.value) : "";
          return (
            <FormItem>
              <FormLabel>{t("interest_rate")}</FormLabel>
              <FormControl>
                <NumericInput data-testid="interest-rate-input" placeholder="e.g., 5.5" value={value} onChange={field.onChange} allowDecimal={true} maxLength={5} />
              </FormControl>
              <FormMessage />
            </FormItem>
          );
        }} />
        {watchedDebtSubType === "Certificate" && (
          <FormField control={control} name="certificateInterestFrequency" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("certificate_interest_frequency")}</FormLabel>
              <Select data-testid="interest-frequency-select" dir={dir} onValueChange={field.onChange} value={field.value || "Monthly"}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("Select frequency")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Monthly">{t("Monthly")}</SelectItem>
                  <SelectItem value="Quarterly">{t("Quarterly")}</SelectItem>
                  <SelectItem value="Yearly">{t("Yearly")}</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>{t("how_often_interest_is_paid_default_is_monthly")}</FormDescription>
              <FormMessage />
            </FormItem>
          )} />
        )}
      </div>
    </div>
  );
};

export const MemoizedRenderDebtFields = React.memo(RenderDebtFieldsComponent);
