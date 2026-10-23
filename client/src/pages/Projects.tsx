import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Project } from '../types'
import {
    ArrowBigDownDashIcon,
    EyeIcon,
    EyeOffIcon,
    FullscreenIcon,
    LaptopIcon,
    Loader2Icon,
    MessageSquareIcon,
    SaveIcon,
    SmartphoneIcon,
    TabletIcon,
    XIcon,
} from 'lucide-react'
import Sidebar from '../components/Sidebar'
import ProjectPreview, { type ProjectPreviewRef } from '../components/ProjectPreview'
import api from '../configs/axios'
import { authClient } from '../lib/auth-client'
import { toast } from 'sonner'

const Projects = () => {

    const { projectId } = useParams()
    const navigate = useNavigate()

    const { data: session, isPending } = authClient.useSession()

    const [project, setProject] = useState<Project | null>(null)
    const [loading, setLoading] = useState(true)
    const [isGenerating, setIsGenerating] = useState(true)
    const [device, setDevice] = useState<'phone' | 'tablet' | 'desktop'>('desktop')
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    const previewRef = useRef<ProjectPreviewRef>(null)

    const fetchProject = async () => {
        try {
            const { data } = await api.get(`/api/user/project/${projectId}`)
            setProject(data.project)
            setIsGenerating(data.project.current_code ? false : true)
            setLoading(false)
        } catch (error: any) {
            toast.error(error?.response?.data?.message || error.message)
            console.log(error)
        }
    }

    const saveProject = async () => {
        if (!previewRef.current) return
        const code = previewRef.current.getCode()
        if (!code) return
        setIsSaving(true)
        try {
            const { data } = await api.put(`/api/project/save/${projectId}`, { code })
            toast.success(data.message)
        } catch (error: any) {
            toast.error(error?.response?.data?.message || error.message)
            console.log(error)
        } finally {
            setIsSaving(false)
        }
    }

    // download code (index.html)
    const downloadCode = () => {
        const code = previewRef.current?.getCode() || project?.current_code
        if (!code) {
            if (isGenerating) {
                return
            }
            return
        }
        const element = document.createElement('a')
        const file = new Blob([code], { type: "text/html" })
        element.href = URL.createObjectURL(file)
        element.download = "index.html"
        document.body.appendChild(element)
        element.click()
    }

    const togglePublish = async () => {
        try {
            const { data } = await api.get(`/api/user/publish-toggle/${projectId}`)
            toast.success(data.message)
            setProject((prev) => prev ? ({ ...prev, isPublished: !prev.isPublished }) : null)
        } catch (error: any) {
            toast.error(error?.response?.data?.message || error.message)
            console.log(error)
        }
    }

    useEffect(() => {
        if (session?.user) {
            fetchProject()
        } else if (!isPending && !session?.user) {
            navigate('/')
            toast('Please login to view your projects')
        }
    }, [session?.user])

    useEffect(() => {
        if (project && !project.current_code) {
            const intervalId = setInterval(fetchProject, 10000)
            return () => clearInterval(intervalId)
        }
    }, [project])

    if (loading) {
        return (
            <>
                <div className='flex items-center justify-center h-screen'>
                    <Loader2Icon className='size-7 animate-spin text-violet-200' />
                </div>
            </>
        )
    }

    return project ? (
        <div className='flex flex-col h-screen w-full bg-gray-900 text-white'>

            {/* builder navbar */}
            <div className='flex max-sm:flex-col sm:items-center gap-4 px-4 py-2 no-scrollbar'>

                {/* left */}
                <div className='flex items-center gap-2 sm:min-w-90 text-nowrap'>
                    <img src="/favicon.svg" alt="logo" className='h-6 cursor-pointer' onClick={() => navigate('/')} />
                    <div className='max-w-64 sm:max-w-xs'>
                        <p className='text-sm text-medium capitalize truncate'>{project.name}</p>
                        <p className='text-xs text-gray-400 -mt-0.5'>Previewing last saved version</p>
                    </div>