"use client";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { propertyTypes } from "@/lib/schemas";
import { useLanguage } from "@/contexts/language-context";
import { getCurrentDate } from "@/lib/utils";
// Removed Controller import from react-hook-form as FormField handles it

interface RealEstateFormProps {
  control: any; // Control object from react-hook-form
}

export const RealEstateForm: React.FC<RealEstateFormProps> = ({ control }) => {
  const { t, dir } = useLanguage();
  return (
    <div className="space-y-6">
      {/* Unit Details Section */}
      <div className="space-y-6 mt-6 p-6 border rounded-md">
        <h3 className="text-lg font-medium text-primary">
          {t("unit_details")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={control}
            name="name"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>{t("name_description_optional")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., Downtown Apartment or Beach House Plot"
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
            name="propertyAddress"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>{t("property_address")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., 123 Main St, Anytown"
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
            name="totalInstallmentPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("total_price_at_end")}</FormLabel>
                <FormControl>
                  <NumericInput
                    placeholder={t("Enter total price at end")}
                    value={field.value || ""}
                    onChange={field.onChange}
                    allowDecimal={true}
                  />
                </FormControl>
                <FormDescription>
                  {t(
                    "the_total_price_of_the_property_at_the_end_of_all_installments",
                  )}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="propertyType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("property_type")}</FormLabel>
                <Select
                  dir={dir}
                  onValueChange={field.onChange}
                  value={field.value || ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("Select property type")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {propertyTypes.map((pType) => (
                      <SelectItem key={pType} value={pType}>
                        {pType}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Installment Details Section */}
      <div className="space-y-6 mt-6 p-6 border rounded-md">
        <h3 className="text-lg font-medium text-primary">
          {t("installment_details")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={control}
            name="purchaseDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("purchase_date")}</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    value={field.value || getCurrentDate()}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="downPayment"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("down_payment_optional")}</FormLabel>
                <FormControl>
                  <NumericInput
                    placeholder="e.g., 50000.00"
                    value={
                      field.value !== undefined && field.value !== null
                        ? String(field.value)
                        : ""
                    }
                    onChange={(val) =>
                      field.onChange(
                        val === undefined || val === null ? "" : String(val),
                      )
                    }
                    allowDecimal={true}
                  />
                </FormControl>
                <FormDescription>
                  {t("initial_payment_made_at_the_start_of_the_contract")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="installmentAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("installment_amount")}</FormLabel>
                <FormControl>
                  <NumericInput
                    placeholder="e.g., 10000.00"
                    value={
                      field.value !== undefined && field.value !== null
                        ? String(field.value)
                        : ""
                    }
                    onChange={(val) =>
                      field.onChange(
                        val === undefined || val === null ? "" : String(val),
                      )
                    }
                    allowDecimal={true}
                  />
                </FormControl>
                <FormDescription>
                  {t("amount_of_each_installment_payment")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="installmentFrequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("installment_frequency")}</FormLabel>
                <Select
                  dir={dir}
                  onValueChange={field.onChange}
                  value={field.value || ""}
                >
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
                <FormDescription>
                  {t("how_often_do_you_pay_the_installment")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="installmentStartDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("installment_start_date")}</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value || ""} />
                </FormControl>
                <FormDescription>
                  {t("when_do_the_installments_start")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="installmentEndDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("installment_end_date")}</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value || ""} />
                </FormControl>
                <FormDescription>
                  {t("when_will_the_installments_end")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="maintenanceAmount" // Name was maintenancePayment, changed to maintenanceAmount
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("maintenance_payment_amount_optional")}
                </FormLabel>
                <FormControl>
                  <NumericInput
                    placeholder="e.g., 1000.00"
                    value={
                      field.value !== undefined && field.value !== null
                        ? String(field.value)
                        : ""
                    }
                    onChange={(val) =>
                      field.onChange(
                        val === undefined || val === null ? "" : String(val),
                      )
                    }
                    allowDecimal={true}
                  />
                </FormControl>
                <FormDescription>
                  {t("maintenance_fee_for_the_property_if_applicable")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="maintenancePaymentDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("maintenance_payment_date_optional")}</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value || ""} />
                </FormControl>
                <FormDescription>
                  {t("date_when_the_maintenance_payment_is_due_if_applicable")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
};

export default RealEstateForm;
