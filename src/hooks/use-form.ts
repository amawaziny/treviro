import { useState, useCallback } from "react";

export interface FormState {
  [key: string]: any;
}

export interface FormOptions {
  initialData?: FormState;
  onSubmit?: (data: FormState) => void;
  onReset?: () => void;
}

export function useForm(options: FormOptions = {}) {
  const { initialData = {}, onSubmit, onReset } = options;
  const [formData, setFormData] = useState<FormState>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback((name: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
        if (onSubmit) {
          await onSubmit(formData);
        }
      } catch (error) {
        console.error("Form submission failed:", error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, onSubmit],
  );

  const resetForm = useCallback(() => {
    setFormData(initialData);
    if (onReset) {
      onReset();
    }
  }, [initialData, onReset]);

  return {
    formData,
    setFormData,
    handleChange,
    handleSubmit,
    resetForm,
    isSubmitting,
  };
}
