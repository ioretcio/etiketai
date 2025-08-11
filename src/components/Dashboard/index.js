import React, { useEffect, useRef } from 'react'
import Center from '../Center'
import Left from '../Left'
import Right from '../Right'
import { DashboardProvider, useDashboard } from '../../context'
import { listItems, imageURL, loadLabel, saveLabel } from '../../lib/flaskAdapter'
import styles from './styles.module.css'

function useAutosave(value, onSave, delay = 600) {
  const t = useRef(null)
  useEffect(() => {
    if (t.current) clearTimeout(t.current)
    t.current = setTimeout(() => onSave(value), delay)
    return () => t.current && clearTimeout(t.current)
  }, [value, onSave, delay])
}

export default function Dashboard({ datasetId }) {
  return (
    <DashboardProvider datasetId={datasetId}>
      <Shell />
    </DashboardProvider>
  )
}

function Shell() {
  const { state, dispatch } = useDashboard()
  const datasetId = state.datasetId
  const datasetMode = !!datasetId

  // 1) завантаження списку файлів + стартових лейблів
  useEffect(() => {
    if (!datasetMode) return
    let alive = true
    ;(async () => {
      const raws = await listItems(datasetId)
      const prepared = await Promise.all(raws.map(async it => ({
        name: it.image_rel.split('/').pop(),
        remoteUrl: imageURL(datasetId, it.image_rel),
        labelRel: it.label_rel,
        labelData: await loadLabel(datasetId, it.label_rel) // null якщо нема
      })))
      if (!alive) return
      dispatch({ type: 'set-remote-files', files: prepared })
    })()
    return () => { alive = false }
  }, [datasetMode, datasetId, dispatch])

  // 2) автозбереження активного файлу
  useAutosave(
    { boxes: state.allBoxes[state.fileIndex], names: state.allBoxesNames[state.fileIndex] },
    async ({ boxes, names }) => {
      if (!datasetMode) return
      const f = state.files[state.fileIndex]
      if (!f?.labelRel) return
      try {
        await saveLabel(datasetId, f.labelRel, { boxes, names }) // формат: JSON
        dispatch({ type: 'saved' })
      } catch (e) {
        console.error('Autosave failed', e)
      }
    },
    800
  )

  return (
    <div className={styles.dashboard}>
      <div className={styles.left}><Left /></div>
      <div className={styles.center}><Center /></div>
      <div className={styles.right}><Right /></div>
    </div>
  )
}