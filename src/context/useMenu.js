// src/context/useMenu.js
import extractFilesLabels from '../utils/extractFilesLabels'
import useZoom from './useZoom'
import { useDashboard } from '.'

const DELTA = 2

export default function useMenu() {
  const { state, dispatch } = useDashboard()
  const onZoom = useZoom()

  const datasetMode = !!state.datasetId
  const hasFiles = state.files.length > 0
  const hasSelectedBox = state.selectedBox > -1
  const isFirst = state.fileIndex === 0
  const isLast = state.fileIndex === state.files.length - 1
  const hasBoxes = Object.values(state.allBoxes).flat().length > 0

  // Базовий набір пунктів
  const items = [
    {
      label: 'Open',
      icon: '📂',
      type: 'input[file]',
      hotkey: (e) => e.key === 'o',
      action: async (e) =>
        e.target.files.length > 0 &&
        dispatch({
          type: 'load',
          data: await extractFilesLabels([...e.target.files], state.files.length),
        }),
      // у dataset mode приховаємо (див. фільтр нижче)
    },
    {
      label: 'Next',
      icon: '⇨',
      hotkey: (e) => e.key === 'ArrowRight',
      action: () => dispatch({ type: 'next' }),
      disabled: !hasFiles || isLast,
    },
    {
      label: 'Prev',
      icon: '⇦',
      hotkey: (e) => e.key === 'ArrowLeft',
      action: () => dispatch({ type: 'prev' }),
      disabled: !hasFiles || isFirst,
    },
    {
      label: 'Save',
      icon: '💾',
      hotkey: (e) => e.key === 's',
      disabled: !hasFiles || !hasBoxes,
      action: () => dispatch({ type: 'toggle-save-modal' }),
      // у dataset mode приховаємо (див. фільтр нижче)
    },
    {
      label: 'Duplicate RectBox',
      icon: '📑',
      hotkey: (e) => e.key === 'd',
      disabled: !hasFiles || !hasSelectedBox,
      action: () => dispatch({ type: 'duplicate-box' }),
    },
    {
      label: 'Delete RectBox',
      icon: '❌',
      hotkey: (e) => e.key === 'Backspace',
      disabled: !hasFiles || !hasSelectedBox,
      action: () => dispatch({ type: 'remove-box' }),
    },
    {
      label: 'Zoom in',
      icon: '🔍',
      hotkey: (e) => e.key === '+',
      disabled: !hasFiles,
      action: () => onZoom(DELTA),
    },
    {
      label: 'Zoom out',
      icon: '🔍',
      disabled: !hasFiles,
      hotkey: (e) => e.key === '-',
      action: () => onZoom(-DELTA),
    },
  ]

  // У dataset mode прибираємо "Open" та "Save"
  return datasetMode
    ? items.filter((it) => it.label !== 'Open' && it.label !== 'Save')
    : items
}