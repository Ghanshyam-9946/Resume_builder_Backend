const { GoogleGenAI } = require("@google/genai")
const { z } = require("zod")
const { zodToJsonSchema } = require("zod-to-json-schema")

// 🔥 FIX: puppeteer-core + chrome-aws-lambda
const chromium = require("chrome-aws-lambda")
const puppeteer = require("puppeteer-core")

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
})

/* -------------------- SAFE JSON PARSER -------------------- */

function safeJsonParse(text) {
    try {
        let cleaned = text.trim()

        if (cleaned.startsWith("```")) {
            cleaned = cleaned.replace(/```json|```/g, "").trim()
        }

        return JSON.parse(cleaned)
    } catch (err) {
        console.error("JSON PARSE ERROR:", text)
        throw new Error("Invalid JSON from AI")
    }
}

/* -------------------- SCHEMA -------------------- */

const interviewReportSchema = z.object({
    matchScore: z.number(),
    technicalQuestions: z.array(z.object({
        question: z.string(),
        intention: z.string(),
        answer: z.string()
    })),
    behavioralQuestions: z.array(z.object({
        question: z.string(),
        intention: z.string(),
        answer: z.string()
    })),
    skillGaps: z.array(z.object({
        skill: z.string(),
        severity: z.enum(["low", "medium", "high"])
    })),
    preparationPlan: z.array(z.object({
        day: z.number(),
        focus: z.string(),
        tasks: z.array(z.string())
    })),
    title: z.string(),
})

/* -------------------- INTERVIEW REPORT -------------------- */

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {

    const prompt = `Generate an interview report:
Resume: ${resume}
Self Description: ${selfDescription}
Job Description: ${jobDescription}`

    const response = await ai.models.generateContent({
        model: "gemini-1.5-flash", // 🔥 stable
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(interviewReportSchema),
        }
    })

    return safeJsonParse(response.text)
}

/* -------------------- PDF GENERATOR -------------------- */

async function generatePdfFromHtml(htmlContent) {
    try {
        const browser = await puppeteer.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath,
            headless: chromium.headless,
        })

        const page = await browser.newPage()

        await page.setContent(htmlContent, {
            waitUntil: "networkidle0"
        })

        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: {
                top: "20mm",
                bottom: "20mm",
                left: "15mm",
                right: "15mm"
            }
        })

        await browser.close()

        return pdfBuffer

    } catch (err) {
        console.error("PUPPETEER ERROR:", err)
        throw err
    }
}

/* -------------------- RESUME PDF -------------------- */

async function generateResumePdf({ resume, selfDescription, jobDescription }) {

    const resumePdfSchema = z.object({
        html: z.string()
    })

    const prompt = `Generate resume HTML only in JSON format:
{
  "html": "<html>...</html>"
}

Resume: ${resume}
Self Description: ${selfDescription}
Job Description: ${jobDescription}

NO markdown, NO explanation.`

    const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(resumePdfSchema),
        }
    })

    const jsonContent = safeJsonParse(response.text)

    if (!jsonContent.html) {
        throw new Error("HTML missing from AI")
    }

    const pdfBuffer = await generatePdfFromHtml(jsonContent.html)

    return pdfBuffer
}

module.exports = {
    generateInterviewReport,
    generateResumePdf
}