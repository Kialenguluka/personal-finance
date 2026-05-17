import { createContext, useContext, useState, useEffect } from "react";

type Language = "pt" | "en";

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, variables?: Record<string, string | number>) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    dashboard: "Dashboard",
    transactions: "Transactions",
    accounts: "Accounts",
    categories: "Categories",
    budgets: "Budgets",
    goals: "Goals",
    reports: "Reports",
    admin: "Admin",
    profile: "Profile",
    login: "Login",
    register: "Register",
    logout: "Logout",
    totalBalance: "Total Balance",
    monthlyIncome: "Monthly Income",
    monthlyExpense: "Monthly Expense",
    recentTransactions: "Recent Transactions",
    cashflow: "Cashflow",
    expensesByCategory: "Expenses by Category",
    newTransaction: "New Transaction",
    noData: "No data available",
    amount: "Amount",
    date: "Date",
    type: "Type",
    category: "Category",
    account: "Account",
    description: "Description",
    notes: "Notes",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    income: "Income",
    expense: "Expense",
    language: "Language",
    theme: "Theme",
    system: "System",
    light: "Light",
    dark: "Dark",
    email: "Email",
    password: "Password",
    name: "Name",
    settings: "Settings",
    success: "Success",
    error: "Error",
    welcome: "Welcome",
    unauthorized: "Unauthorized",
  },
  pt: {
    dashboard: "Painel",
    transactions: "Transações",
    accounts: "Contas",
    categories: "Categorias",
    budgets: "Orçamentos",
    goals: "Objetivos",
    reports: "Relatórios",
    admin: "Administração",
    profile: "Perfil",
    login: "Entrar",
    register: "Registar",
    logout: "Sair",
    totalBalance: "Saldo Total",
    monthlyIncome: "Receita Mensal",
    monthlyExpense: "Despesa Mensal",
    recentTransactions: "Transações Recentes",
    cashflow: "Fluxo de Caixa",
    expensesByCategory: "Despesas por Categoria",
    newTransaction: "Nova Transação",
    noData: "Sem dados disponíveis",
    amount: "Montante",
    date: "Data",
    type: "Tipo",
    category: "Categoria",
    account: "Conta",
    description: "Descrição",
    notes: "Notas",
    save: "Guardar",
    cancel: "Cancelar",
    delete: "Eliminar",
    edit: "Editar",
    income: "Receita",
    expense: "Despesa",
    language: "Idioma",
    theme: "Tema",
    system: "Sistema",
    light: "Claro",
    dark: "Escuro",
    email: "E-mail",
    password: "Palavra-passe",
    name: "Nome",
    settings: "Definições",
    success: "Sucesso",
    error: "Erro",
    welcome: "Bem-vindo",
    unauthorized: "Não autorizado",
  },
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem("language");
    return (stored === "pt" || stored === "en") ? stored : "pt";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
  };

  const t = (key: string, variables?: Record<string, string | number>) => {
    let text = translations[language]?.[key] || translations["en"]?.[key] || key;
    
    if (variables) {
      Object.entries(variables).forEach(([k, v]) => {
        text = text.replace(`{{${k}}}`, String(v));
      });
    }
    
    return text;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}
