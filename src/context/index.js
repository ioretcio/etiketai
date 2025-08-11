// src/context/index.js
import { createContext, useContext, useReducer, useEffect, useRef } from 'react'

const Ctx = createContext({})

// початковий стейт + datasetId (нове поле)
const initialState = {
  datasetId: null,   // <-- нове: коли працюємо через Flask API
  allBoxes: {},
  allBoxesNames: {},
  files: [],         // у dataset mode: [{ name, remoteUrl, labelRel, labelData }]
  saved: true,
  size: {},          // як у тебе (задається через set-size)
  zoom: 0,
}

function reducer(state, action) {
  // допоміжні з твоєї логіки
  const boxes = (state.allBoxes[state.fileIndex] || []).slice()
  const boxNames = { ...(state.allBoxesNames[state.fileIndex] || {}) }

  function updateBoxes(b) {
    return {
      ...state.allBoxes,
      [state.fileIndex]: b,
    }
  }

  function updateBoxNames(names) {
    return { ...state.allBoxesNames, [state.fileIndex]: names }
  }

  switch (action.type) {
    // ---- НОВЕ: дані з бекенду (Flask) ----
    case 'set-remote-files': {
      const files = action.files || []
      const allBoxes = {}
      const allBoxesNames = {}
      files.forEach((f, i) => {
        // очікуємо JSON-формат лейблів: { boxes: [...], names: {...} }
        if (f && typeof f.labelData === 'object' && f.labelData !== null) {
          allBoxes[i] = Array.isArray(f.labelData.boxes) ? f.labelData.boxes : []
          allBoxesNames[i] = typeof f.labelData.names === 'object' && f.labelData.names !== null
            ? f.labelData.names
            : {}
        } else {
          allBoxes[i] = []
          allBoxesNames[i] = {}
        }
      })
      return {
        ...state,
        files,
        fileIndex: files.length ? 0 : state.fileIndex,
        allBoxes,
        allBoxesNames,
        selectedBox: -1,
        saved: true,
      }
    }

    // ---- твоя існуюча логіка без змін семантики ----
    case 'save':
      return {
        ...state,
        saved: true,
      }

    // синонім до 'save' (зручно викликати з autosave)
    case 'saved':
      return {
        ...state,
        saved: true,
      }

    case 'toggle-save-modal':
      return {
        ...state,
        isSaveModalOpen: !state.isSaveModalOpen,
      }

    case 'add-box':
      return {
        ...state,
        selectedBox: boxes.length,
        saved: false,
        allBoxes: updateBoxes([...boxes, action.data]),
      }

    case 'duplicate-box':
      return {
        ...state,
        selectedBox: boxes.length,
        saved: false,
        allBoxes: updateBoxes([...boxes, boxes[state.selectedBox]]),
        allBoxesNames: updateBoxNames({
          ...boxNames,
          [boxes.length]: boxNames[state.selectedBox],
        }),
      }

    case 'move-box': {
      const [osx, osy, omx, omy] = boxes[state.selectedBox]
      const [sx, sy, mx, my] = action.data
      const x = mx - sx
      const y = my - sy

      boxes[state.selectedBox] = [osx + x, osy + y, omx + x, omy + y]

      return { ...state, saved: false, allBoxes: updateBoxes(boxes) }
    }

    case 'edit-box':
      return {
        ...state,
        saved: false,
        selectedBox: action.data.index,
        allBoxes: updateBoxes(
          boxes.map((box, i) =>
            i === action.data.index ? action.data.box : box
          )
        ),
      }

    case 'remove-box': {
      delete boxNames[state.selectedBox]

      return {
        ...state,
        saved: false,
        selectedBox: undefined,
        allBoxes: updateBoxes(boxes.filter((_, i) => i != state.selectedBox)),
        allBoxesNames: updateBoxNames(boxNames),
      }
    }

    case 'select-box':
      return { ...state, selectedBox: action.data }

    case 'rename-label':
      return {
        ...state,
        saved: false,
        allBoxesNames: updateBoxNames({
          ...boxNames,
          [state.selectedBox + '']: action.data,
        }),
      }

    case 'set-zoom':
      return { ...state, zoom: state.zoom + action.data }

    case 'set-size':
      return { ...state, size: action.data }

    case 'load': {
      // локальний режим (як було): додаєш images та готові мапи allBoxes/allBoxesNames
      const { images, allBoxes, allBoxesNames } = action.data

      return {
        ...state,
        files: [...state.files, ...images],
        fileIndex: images.length ? state.files.length : state.fileIndex,
        allBoxes: { ...state.allBoxes, ...allBoxes },
        allBoxesNames: { ...state.allBoxesNames, ...allBoxesNames },
      }
    }

    case 'next':
      return {
        ...state,
        selectedBox: -1,
        fileIndex:
          state.fileIndex < state.files.length - 1
            ? state.fileIndex + 1
            : state.fileIndex,
      }

    case 'prev':
      return {
        ...state,
        selectedBox: -1,
        fileIndex: state.fileIndex > 0 ? state.fileIndex - 1 : state.fileIndex,
      }

    case 'change-file':
      return {
        ...state,
        selectedBox: -1,
        fileIndex: action.data,
      }

    default:
      throw new Error()
  }
}

export function DashboardProvider({ children, datasetId = null }) {
  const canvasRef = useRef()
  const ctxRef = useRef()
  const imgRef = useRef()
  // ініціалізація з datasetId, щоб Left/Center/Right могли знати режим
  const [state, dispatch] = useReducer(
    reducer,
    initialState,
    (s) => ({ ...s, datasetId })
  )

  const boxes = state.allBoxes[state.fileIndex] || []
  const boxNames = state.allBoxesNames[state.fileIndex] || {}

  // попередження про незбережені зміни (твоя логіка) — лишаю як було
  useEffect(() => {
    if (state.files.length === 0 || state.saved) return
    if (process.env.NODE_ENV !== 'production') return

    function beforeunload(e) {
      const confirmationMessage = 'Changes that you made may not be saved.'
      e.returnValue = confirmationMessage
      return confirmationMessage
    }

    window.addEventListener('beforeunload', beforeunload)
    return () => window.removeEventListener('beforeunload', beforeunload)
  }, [state.files, state.saved])

  return (
    <Ctx.Provider
      value={{ state, boxes, boxNames, dispatch, canvasRef, ctxRef, imgRef }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useDashboard() {
  return useContext(Ctx)
}

export default Ctx
