import React, { useEffect } from 'react';
import { twMerge } from 'tailwind-merge';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { Notification, NotificationType } from '../../types';

interface NotificationToastProps {
  notification: Notification;
  onClose: (id: string) => void;
}

export function NotificationToast({ notification, onClose }: NotificationToastProps) {
  useEffect(() => {
    if (notification.duration && notification.duration > 0) {
      const timer = setTimeout(() => {
        onClose(notification.id);
      }, notification.duration);
      
      return () => clearTimeout(timer);
    }
  }, [notification, onClose]);

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-[#F7931A] animate-pulse-once" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500 animate-bounce" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500 animate-pulse-once" />;
      case 'info':
      default:
        return <Info className="h-5 w-5 text-[#8B5CF6] animate-pulse-once" />;
    }
  };

  const getStyles = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return 'bg-white/80 border-[#F7931A] text-[#F7931A] dark:bg-gray-900/80 dark:border-[#F7931A] shadow-lg';
      case 'error':
        return 'bg-white/80 border-red-500 text-red-500 dark:bg-gray-900/80 dark:border-red-500 shadow-lg';
      case 'warning':
        return 'bg-white/80 border-yellow-500 text-yellow-500 dark:bg-gray-900/80 dark:border-yellow-500 shadow-lg';
      case 'info':
      default:
        return 'bg-white/80 border-[#8B5CF6] text-[#8B5CF6] dark:bg-gray-900/80 dark:border-[#8B5CF6] shadow-lg';
    }
  };

  const getCloseColor = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return 'focus:ring-[#F7931A] hover:text-[#F7931A]';
      case 'error':
        return 'focus:ring-red-500 hover:text-red-500';
      case 'warning':
        return 'focus:ring-yellow-500 hover:text-yellow-500';
      case 'info':
      default:
        return 'focus:ring-[#8B5CF6] hover:text-[#8B5CF6]';
    }
  };

  return (
    <div
      className={twMerge(
        'w-full max-w-sm rounded-2xl border-2 p-4 shadow-xl backdrop-blur-md animate-slide-in font-bold',
        getStyles(notification.type)
      )}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">{getIcon()}</div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-bold text-inherit dark:text-inherit">
            {notification.message}
          </p>
        </div>
        <button
          type="button"
          className={`ml-4 inline-flex flex-shrink-0 rounded-md text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 ${getCloseColor(notification.type)}`}
          onClick={() => onClose(notification.id)}
        >
          <span className="sr-only">Close</span>
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

interface NotificationContainerProps {
  notifications: Notification[];
  onClose: (id: string) => void;
}

export function NotificationContainer({ notifications, onClose }: NotificationContainerProps) {
  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 flex flex-col items-end z-50 pointer-events-none p-4 space-y-4 max-h-screen overflow-hidden">
      {notifications.map((notification) => (
        <div key={notification.id} className="pointer-events-auto w-full max-w-sm">
          <NotificationToast notification={notification} onClose={onClose} />
        </div>
      ))}
    </div>
  );
}