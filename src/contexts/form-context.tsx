import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface HeaderProps {
  showBackButton?: boolean;
  backHref?: string;
  backLabel?: string;
  title?: string;
  showNavControls?: boolean;
}

interface FormContextType {
  isFormOpen: boolean;
  openForm: () => void;
  closeForm: () => void;
  headerProps: HeaderProps;
  setHeaderProps: (props: HeaderProps) => void;
}

const FormContext = createContext<FormContextType | undefined>(undefined);

export function FormProvider({ children }: { children: ReactNode }) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [headerProps, setHeaderProps] = useState<HeaderProps>({
    showBackButton: false,
    backHref: '/',
    backLabel: 'Back',
    title: '',
    showNavControls: true
  });

  const openForm = useCallback(() => {
    setIsFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setIsFormOpen(false);
  }, []);

  const updateHeaderProps = useCallback((props: HeaderProps) => {
    setHeaderProps(prev => ({
      ...prev,
      ...props
    }));
  }, []);

  return (
    <FormContext.Provider value={{ 
      isFormOpen, 
      openForm, 
      closeForm, 
      headerProps,
      setHeaderProps: updateHeaderProps 
    }}>
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
