import React, { createContext, useContext, useState, useEffect } from "react";
import { translations, Language } from "@/lib/translations";

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => any;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const PREFS_KEY = "trustpay_settings";

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState<Language>("en");

    useEffect(() => {
        try {
            const saved = localStorage.getItem(PREFS_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.language) {
                    setLanguageState(parsed.language as Language);
                }
            }
        } catch (e) {
            console.error("Failed to load language preference", e);
        }
    }, []);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        try {
            const saved = localStorage.getItem(PREFS_KEY);
            const parsed = saved ? JSON.parse(saved) : {};
            localStorage.setItem(PREFS_KEY, JSON.stringify({ ...parsed, language: lang }));
        } catch (e) {
            console.error("Failed to save language preference", e);
        }
    };

    const t = (path: string) => {
        const keys = path.split(".");
        let current: any = translations[language] || translations.en;

        for (const key of keys) {
            if (current[key] === undefined) {
                // Fallback to English if key missing in current language
                let fallback = translations.en;
                for (const fKey of keys) {
                    if (fallback[fKey] === undefined) return path;
                    fallback = fallback[fKey];
                }
                return fallback;
            }
            current = current[key];
        }
        return current;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
};
