'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  const handleReset = async () => {
    if (!password || password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setStatus('loading')
    const res = await fetch('/api/users?action=reset_password&token=' + token + '&password=' + encodeURIComponent(password))
    const data = await res.json()
    if (data.success) {
      setStatus('success')
    } else {
      setError(data.error || 'Failed to reset password')
      setStatus('idle')
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0e0d', fontFamily: 'sans-serif' }}>
      <div style={{ background: 'white', borderRadius: '8px', padding: '2.5rem', width: '360px', maxWidth: '90vw', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
        <h1 style={{ fontSize: '1.3rem', marginBottom: '0.25rem', color: '#0f0e0d' }}>Nectera Holdings</h1>
        {status === 'success' ? (
          <>
            <p style={{ color: '#4a6741', fontSize: '0.9rem', margin: '1rem 0' }}>Password reset successfully!</p>
            <a href="/" style={{ display: 'block', textAlign: 'center', padding: '0.6rem', borderRadius: '4px', background: '#0f0e0d', color: 'white', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '500' }}>Sign In</a>
          </>
        ) : (
          <>
            <p style={{ fontSize: '0.85rem', color: '#8a8070', marginBottom: '1.5rem' }}>Enter your new password</p>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="New password" style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '4px', border: '1px solid #e0d8cc', fontSize: '0.9rem', marginBottom: '0.5rem', boxSizing: 'border-box', outline: 'none' }} />
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleReset()} placeholder="Confirm password" style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '4px', border: '1px solid #e0d8cc', fontSize: '0.9rem', marginBottom: '0.75rem', boxSizing: 'border-box', outline: 'none' }} />
            {error && <p style={{ color: '#b85c38', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{error}</p>}
            <button onClick={handleReset} disabled={status === 'loading'} style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: 'none', background: '#0f0e0d', color: 'white', fontSize: '0.9rem', cursor: 'pointer', fontWeight: '500', opacity: status === 'loading' ? 0.6 : 1 }}>{status === 'loading' ? 'Resetting...' : 'Reset Password'}</button>
          </>
        )}
      </div>
    </div>
  )
}

export default function ResetPassword() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}
