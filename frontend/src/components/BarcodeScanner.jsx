import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/library'

export default function BarcodeScanner({ onDetected, onClose }) {
  const videoRef = useRef(null)
  const readerRef = useRef(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const reader = new BrowserMultiFormatReader()
    readerRef.current = reader
    reader.decodeFromVideoDevice(null, videoRef.current, (result, err) => {
      if (result) {
        onDetected(result.getText())
        reader.reset()
        onClose()
      }
    }).catch(e => setError('Camera not available: ' + e.message))
    return () => { reader.reset() }
  }, [])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl overflow-hidden shadow-2xl max-w-sm w-full mx-4">
        <div className="p-4 flex justify-between items-center border-b">
          <span className="font-semibold text-slate-800">Scan Barcode</span>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 text-xl font-bold">&times;</button>
        </div>
        {error ? (
          <div className="p-6 text-red-600 text-center">{error}</div>
        ) : (
          <video ref={videoRef} className="w-full" />
        )}
        <div className="p-3">
          <button onClick={onClose} className="w-full bg-slate-200 hover:bg-slate-300 text-slate-800 py-2 rounded-lg text-sm font-medium">
            Close Camera
          </button>
        </div>
      </div>
    </div>
  )
}
