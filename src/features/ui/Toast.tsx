interface ToastProps {
  tone: 'success' | 'error';
  message: string;
}

export const Toast = ({ tone, message }: ToastProps) => (
  <div className={`toast${tone === 'error' ? ' error' : ''}`} role="status">
    <strong>{tone === 'error' ? 'Notice' : 'Success'}</strong>
    <span>{message}</span>
  </div>
);
