import React from 'react';
import { twMerge } from 'tailwind-merge';

interface SwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
  highlightColor?: string;
}

export function Switch({
  checked = false,
  onChange,
  label,
  description,
  disabled = false,
  className,
  highlightColor = '#F7931A',
}: SwitchProps) {
  const handleChange = () => {
    if (disabled) return;
    onChange?.(!checked);
  };

  return (
    <div className={twMerge('flex items-center', className)}>
      <div className="flex-shrink-0">
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={handleChange}
          className={twMerge(
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            checked ? '' : 'bg-gray-300 dark:bg-gray-600',
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          )}
          style={checked ? { background: highlightColor, boxShadow: `0 0 0 2px ${highlightColor}33` } : {}}
          tabIndex={0}
        >
          <span
            className={twMerge(
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
              checked ? 'translate-x-6' : 'translate-x-1'
            )}
          />
        </button>
      </div>
      {(label || description) && (
        <div className="ml-3">
          {label && (
            <div 
              className={twMerge(
                'text-sm font-medium',
                disabled ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'
              )}
            >
              {label}
            </div>
          )}
          {description && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {description}
            </div>
          )}
        </div>
      )}
    </div>
  );
}