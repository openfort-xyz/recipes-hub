import { OpenfortButton, useUser } from '@openfort/react'
import { CollectDataFrame } from './components/CollectDataFrame'
import { MainLayout } from './components/MainLayout'
import { PaymentForm } from './components/PaymentForm'
import { PaymentOptions } from './components/PaymentOptions'
import { PaymentResult } from './components/PaymentResult'
import { usePayment } from './hooks/usePayment'
import { missingEnv } from './utils/env'

function EnvNotice({ missing }: { missing: string[] }) {
  return (
    <div className="w-full rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-4 text-left">
      <p className="text-yellow-300 font-medium text-sm">Missing environment variables</p>
      <ul className="mt-2 list-disc list-inside text-yellow-200/80 text-xs space-y-1">
        {missing.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="text-yellow-200/60 text-xs mt-2">Copy .env.example to .env and fill these in.</p>
    </div>
  )
}

function PaymentPanel() {
  const {
    phase,
    response,
    selected,
    step,
    txId,
    error,
    isSample,
    fetchOptions,
    loadSample,
    selectOption,
    submitCollectedData,
    reset,
    fail,
  } = usePayment()

  if (phase === 'idle' || phase === 'fetching') {
    return (
      <PaymentForm
        onSubmit={fetchOptions}
        onPickSample={(sample) => loadSample(sample.response)}
        isLoading={phase === 'fetching'}
      />
    )
  }

  if (phase === 'review' && response) {
    return (
      <PaymentOptions
        info={response.info}
        options={response.options}
        onSelect={selectOption}
        onBack={reset}
        isSample={isSample}
      />
    )
  }

  if (phase === 'collect' && selected?.collectData?.url) {
    return <CollectDataFrame url={selected.collectData.url} onComplete={() => submitCollectedData()} onError={fail} />
  }

  if (phase === 'signing' || phase === 'confirming' || phase === 'success' || phase === 'failed') {
    return <PaymentResult phase={phase} step={step} txId={txId} error={error} onReset={reset} />
  }

  return null
}

function App() {
  const { isAuthenticated } = useUser()
  const missing = missingEnv()

  return (
    <MainLayout>
      <div className="flex w-full flex-col items-center gap-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-5 sm:border-neutral-700 sm:p-6 sm:shadow-xl">
        {missing.length > 0 && <EnvNotice missing={missing} />}
        <OpenfortButton showBalance={false} showAvatar={true} label="Connect Wallet" />
        {isAuthenticated && missing.length === 0 && <PaymentPanel />}
      </div>
    </MainLayout>
  )
}

export default App
