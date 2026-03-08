"use client";

import { useLanguage } from "@/contexts/language-context";
import { useForm } from "@/contexts/form-context";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm as useReactHookForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ListedSecuritySchema,
  type ListedSecurityFormValues,
  securityTypes,
  fundTypes,
  currencyTypes,
} from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

const initialFormValues: ListedSecurityFormValues = {
  name: "",
  name_ar: "",
  symbol: "",
  // @ts-expect-error price should be string for form input
  price: "",
  currency: "EGP",
  securityType: "Stock",
  fundType: undefined,
  isin: "",
  market: "",
  sector: "",
  description: "",
  // @ts-expect-error numeric inputs are strings for form
  high: "",
  // @ts-expect-error numeric inputs are strings for form
  low: "",
  // @ts-expect-error numeric inputs are strings for form
  volume: "",
};

export interface ListedSecurityFormProps {
  initialValues?: Partial<ListedSecurityFormValues>;
  onSubmit: (values: ListedSecurityFormValues) => Promise<void>;
  isEditMode?: boolean;
}

export function ListedSecurityForm({
  initialValues,
  onSubmit,
  isEditMode,
}: ListedSecurityFormProps) {
  const { t, dir } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();
  const { setHeaderProps, openForm, closeForm } = useForm();

  const form = useReactHookForm<ListedSecurityFormValues>({
    resolver: zodResolver(ListedSecuritySchema),
    defaultValues: initialValues ?? initialFormValues,
  });

  useEffect(() => {
    // Open form when component mounts
    openForm();

    setHeaderProps({
      showBackButton: true,
      showNavControls: false,
      title: isEditMode ? t("edit_security_record") : t("add_new_security"),
      description: t(
        "add_security_details_to_explore_stocks_and_funds_from_different_markets",
      ),
      backLabel: t("back_to_securities"),
      backHref: "/securities",
    });

    // Clean up when component unmounts
    return () => {
      closeForm();
    };
  }, [setHeaderProps, closeForm, openForm, isEditMode, t]);

  const watchedSecurityType = form.watch("securityType");

  const handleInternalSubmit = async (values: ListedSecurityFormValues) => {
    try {
        await onSubmit(values);
      
        toast({
          title: t("success"),
          description: t("security_record_saved_successfully"),
        });

        router.push("/securities");
    } catch (error) {
      toast({
        title: t("error"),
        description: t("failed_to_save_security_record"),
        variant: "destructive",
      });
      console.error("Error saving security:", error);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleInternalSubmit)}
        className="space-y-8"
      >
        <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem data-testid="name-form-item">
                <FormLabel>{t("security_name")}</FormLabel>
                <FormControl>
                  <Input
                    data-testid="name-input"
                    placeholder={t("e.g., Orascom Telecom")}
                    {...field}
                    disabled={form.formState.isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name_ar"
            render={({ field }) => (
              <FormItem data-testid="name-ar-form-item">
                <FormLabel>{t("security_name_in_arabic")}</FormLabel>
                <FormControl>
                  <Input
                    data-testid="name-ar-input"
                    placeholder={t("e.g., أوراسكوم تليكوم")}
                    {...field}
                    disabled={form.formState.isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="symbol"
            render={({ field }) => (
              <FormItem data-testid="symbol-form-item">
                <FormLabel>{t("symbol")}</FormLabel>
                <FormControl>
                  <Input
                    data-testid="symbol-input"
                    placeholder={t("e.g., OTMT")}
                    {...field}
                    disabled={form.formState.isSubmitting}
                    onChange={(e) =>
                      field.onChange(e.target.value.toUpperCase())
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isin"
            render={({ field }) => (
              <FormItem data-testid="isin-form-item">
                <FormLabel>
                  {t("ISIN")} ({t("optional")})
                </FormLabel>
                <FormControl>
                  <Input
                    data-testid="isin-input"
                    placeholder={t("e.g., EGS38011C017")}
                    {...field}
                    value={field.value ?? ""}
                    disabled={form.formState.isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem data-testid="price-form-item">
                <FormLabel>{t("current_price")}</FormLabel>
                <FormControl>
                  <NumericInput
                    decimalScale={5}
                    data-testid="price-input"
                    placeholder={t("e.g., 500")}
                    value={String(field.value ?? "")}
                    onChange={field.onChange}
                    disabled={form.formState.isSubmitting}
                    min={0}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem data-testid="currency-form-item">
                <FormLabel>{t("currency")}</FormLabel>
                <Select
                  dir={dir}
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={form.formState.isSubmitting}
                >
                  <FormControl>
                    <SelectTrigger data-testid="currency-select">
                      <SelectValue placeholder={t("select_currency")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {currencyTypes.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {t(currency)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="securityType"
            render={({ field }) => (
              <FormItem data-testid="security-type-form-item">
                <FormLabel>{t("security_type")}</FormLabel>
                <Select
                  dir={dir}
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={form.formState.isSubmitting}
                >
                  <FormControl>
                    <SelectTrigger data-testid="security-type-select">
                      <SelectValue placeholder={t("select_security_type")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {securityTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {watchedSecurityType === "Fund" && (
            <FormField
              control={form.control}
              name="fundType"
              render={({ field }) => (
                <FormItem data-testid="fund-type-form-item">
                  <FormLabel>{t("fund_type")}</FormLabel>
                  <Select
                    dir={dir}
                    value={field.value || ""}
                    onValueChange={field.onChange}
                    disabled={form.formState.isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="fund-type-select">
                        <SelectValue placeholder={t("select_fund_type")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {fundTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="market"
            render={({ field }) => (
              <FormItem data-testid="market-form-item">
                <FormLabel>
                  {t("market")}
                </FormLabel>
                <FormControl>
                  <Input
                    data-testid="market-input"
                    placeholder={t("e.g., EGX")}
                    {...field}
                    value={field.value ?? ""}
                    disabled={form.formState.isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sector"
            render={({ field }) => (
              <FormItem data-testid="sector-form-item">
                <FormLabel>
                  {t("sector")} ({t("optional")})
                </FormLabel>
                <FormControl>
                  <Input
                    data-testid="sector-input"
                    placeholder={t("e.g., Telecommunications")}
                    {...field}
                    value={field.value ?? ""}
                    disabled={form.formState.isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="high"
            render={({ field }) => (
              <FormItem data-testid="high-form-item">
                <FormLabel>
                  {t("high_price")} ({t("optional")})
                </FormLabel>
                <FormControl>
                  <NumericInput
                    data-testid="high-input"
                    placeholder={t("e.g., 550")}
                    value={String(field.value ?? "")}
                    onChange={field.onChange}
                    disabled={form.formState.isSubmitting}
                    min={0}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="low"
            render={({ field }) => (
              <FormItem data-testid="low-form-item">
                <FormLabel>
                  {t("low_price")} ({t("optional")})
                </FormLabel>
                <FormControl>
                  <NumericInput
                    data-testid="low-input"
                    placeholder={t("e.g., 450")}
                    value={String(field.value ?? "")}
                    onChange={field.onChange}
                    disabled={form.formState.isSubmitting}
                    min={0}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="volume"
            render={({ field }) => (
              <FormItem data-testid="volume-form-item">
                <FormLabel>
                  {t("volume")} ({t("optional")})
                </FormLabel>
                <FormControl>
                  <NumericInput
                    data-testid="volume-input"
                    placeholder={t("e.g., 1000000")}
                    value={String(field.value ?? "")}
                    onChange={field.onChange}
                    allowDecimal={false}
                    disabled={form.formState.isSubmitting}
                    min={0}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem
                className="md:col-span-2"
                data-testid="description-form-item"
              >
                <FormLabel>
                  {t("description")} ({t("optional")})
                </FormLabel>
                <FormControl>
                  <Textarea
                    data-testid="description-input"
                    placeholder={t("e.g., Description of the security")}
                    {...field}
                    value={field.value ?? ""}
                    disabled={form.formState.isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="logoUrl"
            render={({ field }) => (
              <FormItem
                className="md:col-span-2"
                data-testid="logoUrl-form-item"
              >
                <FormLabel>
                  {t("logo_url")} ({t("optional")})
                </FormLabel>
                <FormControl>
                  <Input
                    data-testid="logoUrl-input"
                    placeholder={t("e.g., https://example.com/logo.png")}
                    {...field}
                    value={field.value ?? ""}
                    disabled={form.formState.isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          data-testid="submit-button"
        >
          {form.formState.isSubmitting && (
            <Loader2
              className="mr-2 h-4 w-4 animate-spin"
              data-testid="loading-spinner"
            />
          )}
          <span data-testid="submit-button-text">
            {isEditMode ? t("update_security") : t("add_security")}
          </span>
        </Button>
      </form>
    </Form>
  );
}
