// src/components/Dashboard/index.js
import React, { useEffect, useRef } from 'react'
import Center from '../Center'
import Left from '../Left'
import Right from '../Right'
import { DashboardProvider, useDashboard } from '../../context'
import { listItems, imageURL, loadLabel, saveLabel } from '../../lib/flaskAdapter'
import styles from './styles.module.css'

// простий хук-автозбереження із debounce
function useAutosave(value, onSave, delay = 800) {
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

  // 1) завантаження списку файлів + стартових лейблів коли datasetId з’явився/змінився
  useEffect(() => {
    if (!datasetMode) return
    let alive = true
    ;(async () => {
      try {
        const raws = await listItems(datasetId) // [{image_rel,label_rel,has_label}]
        const prepared = await Promise.all(
          raws.map(async it => {
            let labelData = null
            if (it.has_label) {
              try {
                labelData = await loadLabel(datasetId, it.label_rel)
              } catch (err) {
                console.error(`Failed to load label for ${it.label_rel}`, err)
              }
            }
            return {
              name: it.image_rel.split('/').pop(),
              remoteUrl: imageURL(datasetId, it.image_rel),
              labelRel: it.label_rel,
              labelData
            }
          })
        )
        if (!alive) return
        dispatch({ type: 'set-remote-files', files: prepared })
      } catch (e) {
        console.error('Failed to load dataset files', e)
        dispatch({ type: 'set-remote-files', files: [] })
      }
    })()
    return () => { alive = false }
  }, [datasetMode, datasetId, dispatch])

  // 2) автозбереження активного файлу при змінах
  useAutosave(
    { boxes: state.allBoxes[state.fileIndex], names: state.allBoxesNames[state.fileIndex] },
    async ({ boxes, names }) => {
      if (!datasetMode) return
      const f = state.files[state.fileIndex]
      if (!f?.labelRel) return
      try {
        await saveLabel(datasetId, f.labelRel, { boxes, names })
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
