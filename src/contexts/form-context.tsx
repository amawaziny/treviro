import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface FormContextType {
  isFormOpen: boolean;
  openForm: () => void;
  closeForm: () => void;
}

const FormContext = createContext<FormContextType | undefined>(undefined);

export function FormProvider({ children }: { children: ReactNode }) {
  const [isFormOpen, setIsFormOpen] = useState(false);

  const openForm = useCallback(() => {
    setIsFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setIsFormOpen(false);
  }, []);

  return (
    <FormContext.Provider value={{ isFormOpen, openForm, closeForm }}>
      {children}
    </FormContext.Provider>
  );
}

export function useForm() {
  const context = useContext(FormContext);
  if (context === undefined) {
    throw new Error('useForm must be used within a FormProvider');
  }
  return context;
}
