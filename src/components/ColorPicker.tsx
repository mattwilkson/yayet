import { useState } from 'react'
import { Palette } from 'lucide-react'

interface ColorPickerProps {
  color: string
  onChange: (color: string) => void
  label?: string
}

const predefinedColors = [
  '#DC2626', // Red
  '#F97316', // Orange  
  '#EAB308', // Yellow
  '#84CC16', // Lime
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#F43F5E', // Rose
  '#64748B', // Slate
  '#7C2D12', // Brown
  '#166534', // Dark Green
  '#1E3A8A', // Dark Blue
  '#581C87', // Dark Purple
  '#BE123C', // Dark Red
  '#000000', // Black
]

export const ColorPicker = ({ color, onChange, label }: ColorPickerProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [customColor, setCustomColor] = useState(color)

  const handleColorSelect = (selectedColor: string) => {
    onChange(selectedColor)
    setCustomColor(selectedColor)
    setIsOpen(false)
  }

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value
    setCustomColor(newColor)
    onChange(newColor)
  }

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <div
          className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
          style={{ backgroundColor: color }}
        />
        <Palette className="h-4 w-4 text-gray-500" />
        <span className="text-sm text-gray-700">Choose Color</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 p-4 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-64">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Preset Colors</h4>
              <div className="grid grid-cols-6 gap-2">
                {predefinedColors.map((presetColor) => (
                  <button
                    key={presetColor}
                    type="button"
                    onClick={() => handleColorSelect(presetColor)}
                    className={`w-8 h-8 rounded-full border-2 hover:scale-110 transition-transform ${
                      color === presetColor ? 'border-gray-800' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: presetColor }}
                    title={presetColor}
                  />
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Custom Color</h4>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={customColor}
                  onChange={handleCustomColorChange}
                  className="w-12 h-8 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={customColor}
                  onChange={(e) => {
                    setCustomColor(e.target.value)
                    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                      onChange(e.target.value)
                    }
                  }}
                  placeholder="#000000"
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}