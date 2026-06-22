import React, { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AromaLogo } from "@/components/AromaLayout";
import { LegalLinks } from "@/components/LegalLinks";
import { cn } from "@/lib/utils";

interface AuthFormField {
  name: string;
  label: string;
  type: string;
  placeholder?: string;
  icon?: React.ReactNode;
  required?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}

interface AuthFormProps {
  title: string;
  subtitle?: string;
  fields: AuthFormField[];
  submitLabel: string;
  onSubmit: (data: Record<string, string>) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  footer?: React.ReactNode;
}

export function AuthForm({
  title,
  subtitle,
  fields,
  submitLabel,
  onSubmit,
  isLoading,
  error,
  footer,
}: AuthFormProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit(values);
    } catch {
      // The caller's mutation onError updates the visible error state.
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12 max-w-md mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="w-full"
      >
        <div className="text-center mb-8">
          <AromaLogo size="md" />
          <h2 className="mt-4 text-xl font-semibold text-foreground">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => {
            const isPassword = field.type === "password";
            const showPw = showPasswords[field.name];
            return (
              <div key={field.name} className="space-y-1.5">
                <Label htmlFor={field.name} className="text-sm font-medium text-foreground">
                  {field.label}
                </Label>
                <div className="relative">
                  {field.icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {field.icon}
                    </div>
                  )}
                  <Input
                    id={field.name}
                    name={field.name}
                    type={isPassword ? (showPw ? "text" : "password") : field.type}
                    placeholder={field.placeholder}
                    required={field.required !== false}
                    inputMode={field.inputMode}
                    value={values[field.name] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
                    className={cn(
                      "h-11 rounded-xl border-border/70 bg-white focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all",
                      field.icon ? "pl-10" : "",
                      isPassword ? "pr-10" : "",
                    )}
                  />
                  {isPassword && (
                    <button
                      type="button"
                      onClick={() => setShowPasswords((s) => ({ ...s, [field.name]: !s[field.name] }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPw ? "パスワードを隠す" : "パスワードを表示"}
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-sm"
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </motion.div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-xl gradient-luxury text-white font-semibold text-sm shadow-luxury hover:opacity-90 transition-opacity"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                処理中...
              </div>
            ) : submitLabel}
          </Button>
        </form>

        {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
        <LegalLinks className="mt-5" />
      </motion.div>
    </div>
  );
}
