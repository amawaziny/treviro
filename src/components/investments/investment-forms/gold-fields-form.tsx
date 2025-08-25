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
import { goldTypes } from "@/lib/schemas";
import { useLanguage } from "@/contexts/language-context";
import { getCurrentDate } from "@/lib/utils";

export interface RenderGoldFieldsProps {
  control: any;
  isDedicatedGoldMode?: boolean;
}

const RenderGoldFieldsComponent: React.FC<RenderGoldFieldsProps> = ({
  control,
  isDedicatedGoldMode,
}) => {
  const { t, dir } = useLanguage();
  return (
    <div className="space-y-6 mt-6 p-6 border rounded-md">
      <h3 className="text-lg font-medium text-primary">
        {t("gold_investment_details")}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {!isDedicatedGoldMode && (
          <FormField
            control={control}
            name="name"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>{t("name_description_optional")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("e.g., Gold Bar Q1 2024 or Wedding Gold")}
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
          name="goldType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("gold_type")}</FormLabel>
              <Select
                dir={dir}
                onValueChange={field.onChange}
                value={field.value || ""}
                required
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("Select gold type")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {goldTypes.map((gType) => (
                    <SelectItem key={gType} value={gType}>
                      {gType === "K24" && t("24_karat")}
                      {gType === "K21" && t("21_karat")}
                      {gType === "Pound" && t("gold_pound")}
                      {gType === "Ounce" && t("ounce")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="quantityInGrams"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("quantity_units")}</FormLabel>
              <FormControl>
                <NumericInput
                  placeholder="e.g., 50 or 2"
                  value={
                    field.value !== undefined ? String(field.value) : undefined
                  }
                  onChange={field.onChange}
                  allowDecimal={true}
                />
              </FormControl>
              <FormDescription>
                {t("grams_for_k21k24_units_for_poundounce")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="amountInvested"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("total_amount_invested_cost")}</FormLabel>
              <FormControl>
                <NumericInput
                  placeholder="e.g., 10000.50"
                  value={field.value !== undefined ? String(field.value) : ""}
                  onChange={field.onChange}
                  allowDecimal={true}
                />
              </FormControl>
              <FormDescription>
                {t("total_cost_including_any_fees")}
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

export const MemoizedRenderGoldFieldsSection = React.memo(
  RenderGoldFieldsComponent,
);
