import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { Project } from '../types';
import { iframeScript } from '../assets/assets';
import EditorPanel from './EditorPanel';
import LoaderSteps from './LoaderSteps';

export interface ProjectPreviewRef {
    getCode: () => string | undefined;
}

interface ProjectPreviewProps {
    project: Project;
    isGenerating: boolean;
    device?: 'phone' | 'tablet' | 'desktop';
    showEditorPanel?: boolean;
}

const ProjectPreview = forwardRef<ProjectPreviewRef, ProjectPreviewProps>(({ project, isGenerating, device = 'desktop', showEditorPanel = true }, ref) => {

    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [selectedElement, setSelectedElement] = useState<any>(null);

    const resolutions = {
        phone: 'w-[412px]',
        tablet: 'w-[768px]',
        desktop: 'w-full'
    }

    useImperativeHandle(ref, () => ({
        getCode: () => {
            const doc = iframeRef.current?.contentDocument;
            if (!doc) return undefined;

            // Remove selection class, attribute, outline from all elements
            doc.querySelectorAll('.ai-selected-element,[data-ai-selected]').forEach((el) => {
                el.classList.remove('ai-selected-element');
                el.removeAttribute('data-ai-selected');
                (el as HTMLElement).style.outline = '';
            })

            // Remove injected style + script from the document
            const previewStyle = doc.getElementById('ai-preview-style');
            if (previewStyle) previewStyle.remove();

            const previewScript = doc.getElementById('ai-preview-script');
            if (previewScript) previewScript.remove();

            // Serialize clean HTML
            const html = doc.documentElement.outerHTML;
            return html;
        }
    }));

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data.type === 'ELEMENT_SELECTED') {
                setSelectedElement(event.data.payload);
            } else if (event.data.type === 'CLEAR_SELECTION') {
                setSelectedElement(null);
            }
        }
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [])

    const handleUpdate = (updates: any) => {
        if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage({
                type: 'UPDATE_ELEMENT',
                payload: updates
            }, '*')
        }
    }

    const injectPreview = (html: string) => {
        if (!html) return '';
        if (!showEditorPanel) return html;

        if (html.includes('</body>')) {
            return html.replace('</body>', iframeScript + '</body>');
        } else {
            return html + iframeScript;
        }
    }

    return (
        <div className='relative h-full bg-gray-900 flex-1 rounded-xl overflow-hidden max-md:ml-2'>
            {project.current_code ? (
                <>
                    <iframe
                        ref={iframeRef}
                        srcDoc={injectPreview(project.current_code)}
                        className={`h-full max-sm:w-full ${resolutions[device]} mx-auto transition-all`}
                    />
                    {showEditorPanel && selectedElement && (
                        <EditorPanel
                            selectedElement={selectedElement}
                            onUpdate={handleUpdate}
                            onClose={() => {
                                setSelectedElement(null);
                                if (iframeRef.current?.contentWindow) {
                                    iframeRef.current.contentWindow.postMessage({ type: 'CLEAR_SELECTION_REQUEST' }, '*')
                                }
                            }}
                        />
                    )}
                </>
            ) : isGenerating ? (
                <LoaderSteps />
            ) : (
                <div className='w-full h-full flex items-center justify-center bg-gray-950 text-gray-300'>
                    <div className='text-center p-6 max-w-md flex flex-col items-center gap-3'>
                        <div className='size-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center'>
                            <svg className='size-6' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
                                <path strokeLinecap='round' strokeLinejoin='round' d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' />
                            </svg>
                        </div>
                        <p className='text-lg font-medium text-white'>Website generation could not complete</p>
                        <p className='text-sm text-gray-400'>The AI was unable to generate code for this prompt. You can enter a new request or ask for changes in the chat on the left.</p>
                    </div>
                </div>
            )}
        </div>
    )
})

export default ProjectPreview