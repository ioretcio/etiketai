import { useEffect } from 'react'
import styles from './styles.module.css'

export default function Modal({ title, open, onClose, children }) {
  // Якщо модалка закрита — повертаємо null (це валідний рендер)
  if (!open) return null

  // ESC для закриття
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && typeof onClose === 'function') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleBackdrop = (e) => {
    // клік по фону закриває
    if (e.target === e.currentTarget && typeof onClose === 'function') onClose()
  }

  return (
    <div className={styles.backdrop} onClick={handleBackdrop} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        {title && <div className={styles.header}><h3>{title}</h3></div>}
        <div className={styles.body}>{children}</div>
        <div className={styles.footer}>
          {typeof onClose === 'function' && (
            <button onClick={onClose}>Close</button>
          )}
        </div>
      </div>
    </div>
  )
}