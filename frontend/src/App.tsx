import { usePing } from './api/generated/ping-controller/ping-controller'

export default function App() {
  // Хук сгенерирован Orval из openapi.json (yarn api)
  const { data, isLoading, error } = usePing()

  return (
    <main style={{ fontFamily: 'sans-serif', padding: 32 }}>
      <h1>Hackathon template</h1>
      <p>
        Backend:{' '}
        <code>
          {isLoading ? '...' : error ? String(error) : JSON.stringify(data?.data)}
        </code>
      </p>
    </main>
  )
}
