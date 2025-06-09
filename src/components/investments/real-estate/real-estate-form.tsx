
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
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
import { format } from "date-fns";
import { useLanguage } from '@/contexts/language-context';
// Removed Controller import from react-hook-form as FormField handles it

interface RealEstateFormProps {
  control: any; // Control object from react-hook-form
}

const getCurrentDate = () => {
  const date = new Date();
  return format(date, "yyyy-MM-dd");
};

export const RealEstateForm: React.FC<RealEstateFormProps> = ({ control }) => {
  return (
    <div className="space-y-6">
      {/* Unit Details Section */}
      <div className="space-y-6 mt-6 p-6 border rounded-md">
        <h3 className="text-lg font-medium text-primary">Unit Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={control}
            name="name"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Name / Description (Optional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., Downtown Apartment or Beach House Plot"
                    {...field}
                    value={field.value || ''}
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
                <FormLabel>Property Address</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., 123 Main St, Anytown"
                    {...field}
                    value={field.value || ''}
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
                <FormLabel>Total Price at End</FormLabel>
                <FormControl>
                  <NumericInput
                    placeholder="Enter total price at end"
                    value={field.value || ''}
                    onChange={field.onChange}
                    allowDecimal={true}
                  />
                </FormControl>
                <FormDescription>
                  The total price of the property at the end of all installments.
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
                <FormLabel>Property Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select property type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {propertyTypes.map(pType => (
                      <SelectItem key={pType} value={pType}>{pType}</SelectItem>
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
        <h3 className="text-lg font-medium text-primary">Installment Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={control}
            name="purchaseDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Purchase Date</FormLabel>
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
                <FormLabel>Down Payment (Optional)</FormLabel>
                <FormControl>
                  <NumericInput
                    placeholder="e.g., 50000.00"
                    value={field.value !== undefined && field.value !== null ? String(field.value) : ''}
                    onChange={val => field.onChange(val === undefined || val === null ? '' : String(val))}
                    allowDecimal={true}
                  />
                </FormControl>
                <FormDescription>Initial payment made at the start of the contract.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="installmentAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Installment Amount</FormLabel>
                <FormControl>
                  <NumericInput
                    placeholder="e.g., 10000.00"
                    value={field.value !== undefined && field.value !== null ? String(field.value) : ''}
                    onChange={val => field.onChange(val === undefined || val === null ? '' : String(val))}
                    allowDecimal={true}
                  />
                </FormControl>
                <FormDescription>Amount of each installment payment.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="installmentFrequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Installment Frequency</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Quarterly">Quarterly</SelectItem>
                    <SelectItem value="Yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>How often do you pay the installment?</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="installmentStartDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Installment Start Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value || ''} />
                </FormControl>
                <FormDescription>When do the installments start?</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="installmentEndDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Installment End Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value || ''} />
                </FormControl>
                <FormDescription>When will the installments end?</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="maintenanceAmount" // Name was maintenancePayment, changed to maintenanceAmount
            render={({ field }) => (
              <FormItem>
                <FormLabel>Maintenance Payment Amount (Optional)</FormLabel>
                <FormControl>
                  <NumericInput
                    placeholder="e.g., 1000.00"
                    value={field.value !== undefined && field.value !== null ? String(field.value) : ''}
                    onChange={val => field.onChange(val === undefined || val === null ? '' : String(val))}
                    allowDecimal={true}
                  />
                </FormControl>
                <FormDescription>Maintenance fee for the property, if applicable.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="maintenancePaymentDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Maintenance Payment Date (Optional)</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value || ''} />
                </FormControl>
                <FormDescription>Date when the maintenance payment is due, if applicable.</FormDescription>
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
