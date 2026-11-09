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

// Controller function to create new project
export const createUserProject = async (req: Request, res: Response) => {
    const userId = req.userId;
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

        // Update users total creation
        await prisma.user.update({
            where: { id: userId },
            data: { total_creation: { increment: 1 } }
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
        const promptEnhanceResponse = await openai.chat.completions.create({
            model: 'PUT_MODEL_NAME_HERE',
            messages: [
                {
                    role: 'system',
                    content: `PUT_PROMPT_ENHANCE_SYSTEM_PROMPT_HERE`
                },
                {
                    role: 'user',
                    content: initial_prompt
                }
            ]
        })

        const enhancedPrompt = promptEnhanceResponse.choices[0].message.content;

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

        // Generate website code
        const codeGenerationResponse = await openai.chat.completions.create({
            model: 'PUT_MODEL_NAME_HERE',
            messages: [
                {
                    role: 'system',
                    content: `PUT_CODE_GENERATION_SYSTEM_PROMPT_HERE`
                },
                {
                    role: 'user',
                    content: enhancedPrompt || ''
                }
            ]
        })

        const code = codeGenerationResponse.choices[0].message.content || '';

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
                code: code.replace(/```[a-z]*\n?/gi, '').replace(/```$/g, '').trim(),
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
                current_code: code.replace(/```[a-z]*\n?/gi, '').replace(/```$/g, '').trim(),
                current_version_index: version.id
            }
        })

    } catch (error: any) {
        await prisma.user.update({
            where: { id: userId },
            data: { credits: { increment: 5 } }
        })
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message })
    }
}

// Controller function to get a single user project
export const getUserProject = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { projectId } = req.params;

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

        const { projectId } = req.params;

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