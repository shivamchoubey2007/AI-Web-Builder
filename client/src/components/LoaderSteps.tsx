import React, { useEffect, useState } from 'react'
import { ScanLine, Layout, Triangle, Circle } from 'lucide-react'

const LoaderSteps = () => {

    const steps = [
        { icon: ScanLine, label: "Analyzing your request..." },
        { icon: Layout, label: "Generating layout & structure..." },
        { icon: Triangle, label: "Assembling UI components..." },
        { icon: Circle, label: "Finalizing your website..." },
    ]

    const stepDuration = 45000;

    const [current, setCurrent] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrent((s) => (s + 1) % steps.length)
        }, stepDuration)
        return () => clearInterval(interval)
    }, [])

    const Icon = steps[current].icon;

    return (
        <div className='w-full h-full flex items-center justify-center bg-gray-950'>
            <div className='flex flex-col items-center gap-6'>

                <div className='relative size-20 flex items-center justify-center'>
                    <div className='absolute inset-0 rounded-full bg-indigo-500/20 animate-ping' />
                    <div className='relative size-16 rounded-full bg-indigo-600/30 flex items-center justify-center'>
                        <Icon className='size-8 text-white opacity-90 animate-bounce' />
                    </div>
                </div>

                {/* Step label fade using transition only, no visual start */}
                <p key={current} className='text-lg font-medium text-white transition-opacity duration-500'>
                    {steps[current].label}
                </p>

                <p className='text-sm text-gray-400'>This may take around 2 to 3 minutes</p>

            </div>
        </div>
    )
}

export default LoaderSteps