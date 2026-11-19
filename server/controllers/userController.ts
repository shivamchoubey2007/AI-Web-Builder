import { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import openai from '../configs/openai.js';
import Stripe from 'stripe';

// Controller function to get user credits
export const getUserCredits = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId }
        })

        res.json({ credits: user?.credits })
    } catch (error: any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message })
    }
}

// Helper to extract clean HTML from AI response (stripping markdown fences, intro text, or reasoning if present)
const extractHtml = (response: any): string => {
    const choice = response?.choices?.[0];
    if (!choice) return '';
    let raw = choice.message?.content || '';
    if (!raw && choice.message?.reasoning) {
        const reasoning = choice.message.reasoning;
        const match = reasoning.match(/<!DOCTYPE\s+html[\s\S]*?<\/html>/i) || reasoning.match(/<html[\s\S]*?<\/html>/i);
        if (match) {
            raw = match[0];
        }
    }
    if (!raw) return '';
    const fenceMatch = raw.match(/```(?:html)?\s*([\s\S]*?)```/i);
    if (fenceMatch && fenceMatch[1].trim()) {
        raw = fenceMatch[1].trim();
    }
    const htmlMatch = raw.match(/<!DOCTYPE\s+html[\s\S]*?<\/html>/i) || raw.match(/<html[\s\S]*?<\/html>/i);
    if (htmlMatch) {
        return htmlMatch[0].trim();
    }
    return raw.replace(/```[a-z]*\n?/gi, '').replace(/```$/g, '').trim();
};

// Controller function to create new project
export const createUserProject = async (req: Request, res: Response) => {
    const userId = req.userId;
    let projectId: string | null = null;
    try {
        const { initial_prompt } = req.body;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId }
        })

        if (user && user.credits < 5) {
            return res.status(403).json({ message: 'Add credits to create more projects' });
        }

        // Create new project
        const project = await prisma.websiteProject.create({
            data: {
                name: initial_prompt.length > 50 ? initial_prompt.substring(0, 47) + '...' : initial_prompt,
                initial_prompt,
                userId
            }
        })
        projectId = project.id;

        // Update users total creation
        await prisma.user.update({
            where: { id: userId },
            data: { totalCreation: { increment: 1 } }
        })

        await prisma.conversation.create({
            data: {
                role: 'user',
                content: initial_prompt,
                projectId: project.id
            }
        })

        await prisma.user.update({
            where: { id: userId },
            data: { credits: { decrement: 5 } }
        })

        res.json({ projectId: project.id })

        // Enhance user prompt
        let enhancedPrompt = initial_prompt;
        try {
            const promptEnhanceResponse = await openai.chat.completions.create({
                model: 'particle-ai/particle-1:free',
                messages: [
                    {
                        role: 'system',
                        content: `You are a prompt enhancement specialist. Take the user's website request and expand it into a detailed, comprehensive prompt that will help create the best possible website.

    Enhance this prompt by:
    1. Adding specific design details (layout, color scheme, typography)
    2. Specifying key sections and features
    3. Describing the user experience and interactions
    4. Including modern web design best practices
    5. Mentioning responsive design requirements
    6. Adding any missing but important elements

Return ONLY the enhanced prompt, nothing else. Make it detailed but concise (2-3 paragraphs max).`
                    },
                    {
                        role: 'user',
                        content: initial_prompt
                    }
                ],
                max_tokens: 1500
            })
            enhancedPrompt = promptEnhanceResponse.choices[0]?.message?.content || initial_prompt;
        } catch (err: any) {
            console.warn('Prompt enhancement failed, using original prompt:', err.message);
        }

        await prisma.conversation.create({
            data: {
                role: 'assistant',
                content: `I have enhanced your prompt to: "${enhancedPrompt}"`,
                projectId: project.id
            }
        })

        await prisma.conversation.create({
            data: {
                role: 'assistant',
                content: 'now generating your website...',
                projectId: project.id
            }
        })

        const codeGenSystemPrompt = `You are an expert web developer. Create a complete, production-ready, single-page website based on the user's request.

    CRITICAL REQUIREMENTS:
    - You MUST output valid HTML ONLY.
    - Use Tailwind CSS for ALL styling
    - Include this EXACT script in the <head>: <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
    - Use Tailwind utility classes extensively for styling, animations, and responsiveness
    - Make it fully functional and interactive with JavaScript in <script> tag before closing </body>
    - Use modern, beautiful design with great UX using Tailwind classes
    - Make it responsive using Tailwind responsive classes (sm:, md:, lg:, xl:)
    - Use Tailwind animations and transitions (animate-*, transition-*)
    - Include all necessary meta tags
    - Use Google Fonts CDN if needed for custom fonts
    - Use placeholder images from https://placehold.co/600x400
    - Use Tailwind gradient classes for beautiful backgrounds
    - Make sure all buttons, cards, and components use Tailwind styling

    CRITICAL HARD RULES:
    1. You MUST put ALL output ONLY into message.content.
    2. You MUST NOT place anything in "reasoning", "analysis", "reasoning_details", or any hidden fields.
    3. You MUST NOT include internal thoughts, explanations, analysis, comments, or markdown.
    4. Do NOT include markdown, explanations, notes, or code fences.

    The HTML should be complete and ready to render as-is with Tailwind CSS.`;

        // Generate website code (try particle-ai/particle-1:free first for speed and direct output)
        let code = '';
        try {
            const codeGenerationResponse = await openai.chat.completions.create({
                model: 'particle-ai/particle-1:free',
                messages: [
                    { role: 'system', content: codeGenSystemPrompt },
                    { role: 'user', content: enhancedPrompt }
                ],
                max_tokens: 16000
            });
            code = extractHtml(codeGenerationResponse);
        } catch (genErr: any) {
            console.warn('Primary model error, attempting fallback:', genErr.message);
        }

        // Fallback attempt if code is still empty
        if (!code) {
            try {
                const fallbackResponse = await openai.chat.completions.create({
                    model: 'nvidia/nemotron-3.5-lightning:free',
                    messages: [
                        { role: 'system', content: codeGenSystemPrompt },
                        { role: 'user', content: enhancedPrompt }
                    ],
                    max_tokens: 32000
                });
                code = extractHtml(fallbackResponse);
            } catch (fallbackErr: any) {
                console.error('Fallback model also failed:', fallbackErr.message);
            }
        }

        if (!code) {
            await prisma.conversation.create({
                data: {
                    role: 'assistant',
                    content: 'Unable to generate the code, please try again',
                    projectId: project.id
                }
            })
            await prisma.user.update({
                where: { id: userId },
                data: { credits: { increment: 5 } }
            })
            return;
        }

        // Create version for the project
        const version = await prisma.version.create({
            data: {
                code,
                description: 'Initial version',
                projectId: project.id
            }
        })

        await prisma.conversation.create({
            data: {
                role: 'assistant',
                content: "I have created your website. You can now preview it and request any changes.",
                projectId: project.id
            }
        })

        await prisma.websiteProject.update({
            where: { id: project.id },
            data: {
                current_code: code,
                current_version_index: version.id
            }
        })

    } catch (error: any) {
        console.error('Project creation failed:', error.code || error.message);
        try {
            await prisma.user.update({
                where: { id: userId },
                data: { credits: { increment: 5 } }
            })
        } catch {}

        if (projectId) {
            try {
                await prisma.conversation.create({
                    data: {
                        role: 'assistant',
                        content: 'Unable to generate the code, please try again: ' + (error?.message || 'Error occurred'),
                        projectId
                    }
                })
            } catch {}
        }

        if (!res.headersSent) {
            res.status(500).json({ message: error.message })
        }
    }
}

// Controller function to get a single user project
export const getUserProject = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const projectId = req.params.projectId as string;

        const project = await prisma.websiteProject.findUnique({
            where: { id: projectId, userId },
            include: {
                conversation: {
                    orderBy: { timestamp: 'asc' }
                },
                versions: {
                    orderBy: { timestamp: 'asc' }
                }
            }
        })

        res.json({ project })
    } catch (error: any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message })
    }
}

// Controller function to get all users projects
export const getUserProjects = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const projects = await prisma.websiteProject.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' }
        })

        res.json({ projects })
    } catch (error: any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message })
    }
}

// Controller function to toggle project publish
export const togglePublish = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const projectId = req.params.projectId as string;

        const project = await prisma.websiteProject.findUnique({
            where: { id: projectId, userId }
        })

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        await prisma.websiteProject.update({
            where: { id: projectId },
            data: { isPublished: !project.isPublished }
        })

        res.json({ message: project.isPublished ? 'Project unpublished' : 'Project published successfully' })
    } catch (error: any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message })
    }
}

// Controller function to purchase credits
export const purchaseCredits = async (req: Request, res: Response) => {
    try {
        interface Plan {
            credits: number;
            amount: number;
        }

        const plans = {
            basic: { credits: 100, amount: 5 },
            pro: { credits: 400, amount: 19 },
            enterprise: { credits: 1000, amount: 49 },
        }

        const userId = req.userId;
        const { planId } = req.body as { planId: keyof typeof plans };
        const origin = req.headers.origin as string;

        const plan: Plan = plans[planId];

        if (!plan) {
            return res.status(404).json({ message: 'Plan not found' });
        }

        const transaction = await prisma.transaction.create({
            data: {
                userId: userId!,
                planId: req.body.planId,
                amount: plan.amount,
                credits: plan.credits
            }
        })

        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

        const session = await stripe.checkout.sessions.create({
            success_url: `${origin}/loading`,
            cancel_url: `${origin}`,
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `AI Site Builder - ${plan.credits} credits`
                        },
                        unit_amount: Math.floor(transaction.amount) * 100
                    },
                    quantity: 1
                },
            ],
            mode: 'payment',
            metadata: {
                transactionId: transaction.id,
                appId: 'ai-site-builder'
            },
            expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // Expires in 30 minutes
        });

        res.json({ payment_link: session.url })
    } catch (error: any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message })
    }
}