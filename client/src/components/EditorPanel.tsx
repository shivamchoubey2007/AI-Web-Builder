import { X } from 'lucide-react';
import React, { useEffect, useState } from 'react'

interface EditorPanelProps {
    selectedElement: {
        tagName: string;
        className: string;
        text: string;
        styles: {
            padding: string;
            margin: string;
            backgroundColor: string;
            color: string;
            fontSize: string;
        };
    } | null;
    onUpdate: (updates: any) => void;
    onClose: () => void;
}

const EditorPanel = ({ selectedElement, onUpdate, onClose }: EditorPanelProps) => {

    const [values, setValues] = useState(selectedElement);

    useEffect(() => {
        setValues(selectedElement);
    }, [selectedElement])

    if (!selectedElement || !values) return null;

    const handleChange = (field: string, value: string) => {
        const newValues = { ...values, [field]: value };
        if (field in values.styles) {
            newValues.styles = { ...values.styles, [field]: value };
        }
        setValues(newValues);
        onUpdate({ [field]: value });
    }

    const handleStyleChange = (styleName: string, value: string) => {
        const newStyles = { ...values.styles, [styleName]: value };
        setValues({ ...values, styles: newStyles });
        onUpdate({ styles: { [styleName]: value } });
    }

    return (
        <div className='absolute top-4 right-4 w-80 bg-white p-4 rounded-lg shadow-lg z-50 animate-fade-in'>
            <div className='flex items-center justify-between mb-4'>
                <h3 className='text-lg font-semibold text-gray-800'>Edit Element</h3>
                <button onClick={onClose} className='p-1 rounded hover:bg-gray-100'>
                    <X className='w-4 h-4 text-gray-600' />
                </button>
            </div>

            <div className='space-y-4 text-black'>

                <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>Text Content</label>
                    <textarea
                        value={values.text}
                        onChange={(e) => handleChange('text', e.target.value)}
                        className='w-full text-sm border border-gray-400 rounded-md p-2 h-20 resize-none'
                    />
                </div>

                <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>Class Name</label>
                    <input
                        type='text'
                        value={values.className || ''}
                        onChange={(e) => handleChange('className', e.target.value)}
                        className='w-full text-sm border border-gray-400 rounded-md p-2'
                    />
                </div>

                <div className='grid grid-cols-2 gap-3'>

                    <div>
                        <label className='block text-sm font-medium text-gray-700 mb-1'>Padding</label>
                        <input
                            type='text'
                            value={values.styles.padding}
                            onChange={(e) => handleStyleChange('padding', e.target.value)}
                            className='w-full text-sm border border-gray-400 rounded-md p-2'
                        />
                    </div>

                    <div>
                        <label className='block text-sm font-medium text-gray-700 mb-1'>Margin</label>
                        <input
                            type='text'
                            value={values.styles.margin}
                            onChange={(e) => handleStyleChange('margin', e.target.value)}
                            className='w-full text-sm border border-gray-400 rounded-md p-2'
                        />
                    </div>

                    <div>
                        <label className='block text-sm font-medium text-gray-700 mb-1'>Font Size</label>
                        <input
                            type='text'
                            value={values.styles.fontSize}
                            onChange={(e) => handleStyleChange('fontSize', e.target.value)}
                            className='w-full text-sm border border-gray-400 rounded-md p-2'
                        />
                    </div>

                    <div>
                        <label className='block text-sm font-medium text-gray-700 mb-1'>Background</label>
                        <div className='flex items-center gap-2 border border-gray-300 rounded-md p-1'>
                            <input
                                type='color'
                                value={values.styles.backgroundColor === 'rgba(0, 0, 0, 0)' ? '#ffffff' : values.styles.backgroundColor}
                                onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                                className='w-6 h-6 cursor-pointer'
                            />
                            <span className='text-xs text-gray-600'>{values.styles.backgroundColor}</span>
                        </div>
                    </div>

                    <div>
                        <label className='block text-sm font-medium text-gray-700 mb-1'>Text Color</label>
                        <div className='flex items-center gap-2 border border-gray-300 rounded-md p-1'>
                            <input
                                type='color'
                                value={values.styles.color}
                                onChange={(e) => handleStyleChange('color', e.target.value)}
                                className='w-6 h-6 cursor-pointer'
                            />
                            <span className='text-xs text-gray-600'>{values.styles.color}</span>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}

export default EditorPanel