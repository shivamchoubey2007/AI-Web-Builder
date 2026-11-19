import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'

/**
 * /loading — Stripe redirects here after a successful checkout.
 * We wait a moment (webhook may need a second to process), then
 * send the user back home with a success toast.
 */
const Loading = () => {
    const navigate = useNavigate()

    useEffect(() => {
        const timer = setTimeout(() => {
            toast.success('Payment successful! Credits have been added to your account.')
            navigate('/')
        }, 3000) // 3 s — enough time for the webhook to process

        return () => clearTimeout(timer)
    }, [navigate])

    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-white gap-4">
            <Loader2Icon className="animate-spin size-10 text-indigo-400" />
            <p className="text-lg font-medium">Processing your payment…</p>
            <p className="text-sm text-gray-400">Please wait, you'll be redirected shortly.</p>
        </div>
    )
}

export default Loading
