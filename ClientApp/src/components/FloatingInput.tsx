import React, { useState } from 'react';

interface FloatingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  icon?: React.ReactNode;
  error?: string | null;
  helperText?: string;
  required?: boolean;
}

export const FloatingInput: React.FC<FloatingInputProps> = ({
  id,
  label,
  icon,
  error,
  helperText,
  required,
  value,
  placeholder,
  onFocus,
  onBlur,
  className = '',
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value !== undefined && value !== null && String(value).trim().length > 0;
  const isFloating = isFocused || hasValue || Boolean(error);
  const computedPlaceholder = error || (isFocused ? placeholder : '');

  return (
    <div
      className={`floating-field-group ${isFloating ? 'is-floating' : ''} ${
        isFocused ? 'is-focused' : ''
      } ${error ? 'has-error' : ''} ${className}`}
    >
      <input
        id={id}
        value={value}
        placeholder={computedPlaceholder}
        onFocus={(e) => {
          setIsFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          onBlur?.(e);
        }}
        className="floating-input"
        aria-invalid={Boolean(error)}
        aria-describedby={helperText ? `${id}-helper` : undefined}
        {...props}
      />
      <label htmlFor={id} className="floating-label">
        {icon && <span className="floating-label-icon">{icon}</span>}
        <span>
          {label}
          {required && <span className="required-star"> *</span>}
        </span>
      </label>

      {helperText && !error && (
        <span id={`${id}-helper`} className="field-helper-text">
          {helperText}
        </span>
      )}
    </div>
  );
};

interface FloatingTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  id: string;
  label: string;
  icon?: React.ReactNode;
  error?: string | null;
  helperText?: string;
  required?: boolean;
}

export const FloatingTextarea: React.FC<FloatingTextareaProps> = ({
  id,
  label,
  icon,
  error,
  helperText,
  required,
  value,
  placeholder,
  onFocus,
  onBlur,
  className = '',
  rows = 3,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value !== undefined && value !== null && String(value).trim().length > 0;
  const isFloating = isFocused || hasValue || Boolean(error);
  const computedPlaceholder = error || (isFocused ? placeholder : '');

  return (
    <div
      className={`floating-field-group floating-field-textarea ${
        isFloating ? 'is-floating' : ''
      } ${isFocused ? 'is-focused' : ''} ${error ? 'has-error' : ''} ${className}`}
    >
      <textarea
        id={id}
        rows={rows}
        value={value}
        placeholder={computedPlaceholder}
        onFocus={(e) => {
          setIsFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          onBlur?.(e);
        }}
        className="floating-textarea"
        aria-invalid={Boolean(error)}
        aria-describedby={helperText ? `${id}-helper` : undefined}
        {...props}
      />
      <label htmlFor={id} className="floating-label">
        {icon && <span className="floating-label-icon">{icon}</span>}
        <span>
          {label}
          {required && <span className="required-star"> *</span>}
        </span>
      </label>

      {helperText && !error && (
        <span id={`${id}-helper`} className="field-helper-text">
          {helperText}
        </span>
      )}
    </div>
  );
};
