// pages/index.js
import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Dashboard from '../components/Dashboard'

function LabelImgApp() {
  const [datasetId, setDatasetId] = useState(null)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const id = params.get('dataset_id')
    if (id) setDatasetId(id)
  }, [])
  return (
    <ErrorBoundary>
      <Dashboard datasetId={datasetId} />
    </ErrorBoundary>
  )
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(error, errorInfo) { console.log({ error, errorInfo }) }
  render() {
    if (this.state.hasError) {
      return <div style={{ textAlign: 'center' }}><h2>Something went wrong.</h2></div>
    }
    return this.props.children
  }
}

// ⬇️ export as client-only to avoid SSR/prerender errors (Modal, portals, window/document, etc.)
export default dynamic(() => Promise.resolve(LabelImgApp), { ssr: false })
