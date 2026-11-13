import { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import openai from '../configs/openai.js';

// Controller function to make revision
export const makeRevision = async (req: Request, res: Response) => {
    const userId = req.userId;
    try {
        const { projectId } = req.params;
        const { message } = req.body;

        const user = await prisma.user.findUnique({
            where: { id: userId }
        })

        if (!userId || !user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if (user.credits < 5) {
            return res.status(403).json({ message: 'Add more credits to make changes' });
        }

        if (!message || message.trim() === '') {
            return res.status(400).json({ message: 'Please enter a valid prompt' });
        }

        const currentProject = await prisma.websiteProject.findUnique({
            where: { id: projectId, userId },
            include: { versions: true }
        })

        if (!currentProject) {
            return res.status(404).json({ message: 'Project not found' });
        }

        await prisma.conversation.create({
            data: {
                role: 'user',
                content: message,
                projectId
            }
        })

        await prisma.user.update({
            where: { id: userId },
            data: { credits: { decrement: 5 } }
        })

        // Enhance user prompt
        const promptEnhanceResponse = await openai.chat.completions.create({
            model: '~openai/gpt-sol-latest',
            messages: [
                {
                    role: 'system',
                    content: `You are an expert website prompt enhancement assistant.

Your task is to improve the user's website modification request into a clear, detailed, and actionable prompt for a code generation AI.

Instructions:
- Understand the user's original request.
- Make the request specific and easy to implement.
- Include relevant UI, layout, styling, and functionality details.
- Preserve the user's original intent.
- Do not introduce unrelated features.
- Do not suggest unnecessary changes to existing functionality.
- Ensure the requested changes are responsive and user-friendly.
- Return only the enhanced prompt.
- Do not generate code.
- Do not explain your reasoning.`
                },
                {
                    role: 'user',
                    content: `User's request: "${message}"`
                }
            ]
        })

        const enhancedPrompt = promptEnhanceResponse.choices[0].message.content;

        await prisma.conversation.create({
            data: {
                role: 'assistant',
                content: `I have enhanced your prompt to: "${enhancedPrompt}"`,
                projectId
            }
        })

        await prisma.conversation.create({
            data: {
                role: 'assistant',
                content: 'now making changes to your website...',
                projectId
            }
        })

        // Generate website code
        const codeGenerationResponse = await openai.chat.completions.create({
            model: '~openai/gpt-sol-latest',
            messages: [
               {
    role: 'system',
    content: `You are an expert website code generation assistant.

Your task is to modify the existing website code according to the user's requested changes.

Instructions:
- Carefully understand the existing website code.
- Implement the requested changes while preserving the original intent.
- Preserve unrelated functionality and existing components.
- Maintain the existing framework, libraries, and coding conventions.
- Do not introduce unnecessary dependencies.
- Ensure the website remains responsive and user-friendly.
- Return the complete updated website code.
- Do not include explanations.
- Do not use Markdown code fences.
- Return only the code.`
},
                {
                    role: 'user',
                    content: `Here is the current website code: "${currentProject.current_code}" The user wants this change: "${enhancedPrompt}"`
                }
            ]
        })

        const code = codeGenerationResponse.choices[0].message.content || '';

        if (!code) {
            await prisma.conversation.create({
                data: {
                    role: 'assistant',
                    content: 'Unable to generate the code, please try again',
                    projectId
                }
            })
            await prisma.user.update({
                where: { id: userId },
                data: { credits: { increment: 5 } }
            })
            return;
        }

        const version = await prisma.version.create({
            data: {
                code: code.replace(/```[a-z]*\n?/gi, '').replace(/```$/g, '').trim(),
                description: 'changes made',
                projectId
            }
        })

        await prisma.conversation.create({
            data: {
                role: 'assistant',
                content: "I have made the changes to your website. You can now preview it.",
                projectId
            }
        })

        await prisma.websiteProject.update({
            where: { id: projectId },
            data: {
                current_code: code.replace(/```[a-z]*\n?/gi, '').replace(/```$/g, '').trim(),
                current_version_index: version.id
            }
        })

        res.json({ message: 'Changes made successfully' })
    } catch (error: any) {
        await prisma.user.update({
            where: { id: userId },
            data: { credits: { increment: 5 } }
        })
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message })
    }
}

// Controller function to roll back to a specific version
export const rollbackToVersion = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { projectId, versionId } = req.params;

        const project = await prisma.websiteProject.findUnique({
            where: { id: projectId, userId },
            include: { versions: true }
        })

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const version = project.versions.find((version) => version.id === versionId);

        if (!version) {
            return res.status(404).json({ message: 'Version not found' });
        }

        await prisma.websiteProject.update({
            where: { id: projectId, userId },
            data: {
                current_code: version.code,
                current_version_index: version.id
            }
        })

        await prisma.conversation.create({
            data: {
                role: 'assistant',
                content: "I have rolled back your website to selected version. You can now preview it.",
                projectId
            }
        })

        res.json({ message: 'Version rolled back' })
    } catch (error: any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message })
    }
}

// Controller function to delete a project
export const deleteProject = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        const { projectId } = req.params;

        await prisma.websiteProject.delete({
            where: { id: projectId, userId }
        })

        res.json({ message: 'Project deleted successfully' })
    } catch (error: any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message })
    }
}

// Controller for getting project code for preview
export const getProjectPreview = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        const { projectId } = req.params;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const project = await prisma.websiteProject.findFirst({
            where: { id: projectId, userId },
            include: { versions: true }
        })

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        res.json({ project })
    } catch (error: any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message })
    }
}

// Get published projects
export const getPublishedProjects = async (req: Request, res: Response) => {
    try {
        const projects = await prisma.websiteProject.findMany({
            where: { isPublished: true },
            include: { user: true }
        })

        res.json({ projects })
    } catch (error: any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message })
    }
}

// Get a single project by id
export const getProjectById = async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;

        const project = await prisma.websiteProject.findFirst({
            where: { id: projectId }
        })

        if (!project || project.isPublished === false || !project?.current_code) {
            return res.status(404).json({ message: 'Project not found' });
        }

        res.json({ code: project.current_code })
    } catch (error: any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message })
    }
}

// Controller to save project code
export const saveProjectCode = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        const { projectId } = req.params;
        const { code } = req.body;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if (!code) {
            return res.status(400).json({ message: 'Code is required' });
        }

        const project = await prisma.websiteProject.findUnique({
            where: { id: projectId, userId }
        })

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        await prisma.websiteProject.update({
            where: { id: projectId },
            data: { current_code: code, current_version_index: '' }
        })

        res.json({ message: 'Project saved successfully' })
    } catch (error: any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message })
    }
}