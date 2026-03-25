import { AerosHomework } from '@/components/homework/aeros-homework'
import { Suspense } from 'react'

export default function AerosHomeworkPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            fontFamily: 'Inter, sans-serif',
            background: '#fff',
            color: '#64748b',
          }}
        >
          Loading…
        </div>
      }
    >
      <AerosHomework />
    </Suspense>
  )
}
