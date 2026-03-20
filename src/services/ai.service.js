const { GoogleGenAI } = require("@google/genai")
const { z } = require("zod")
const { zodToJsonSchema } = require("zod-to-json-schema")
const puppeteer = require("puppeteer")

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
})

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

    const prompt = `Generate an interview report for a candidate with the following details:
Resume: ${resume}
Self Description: ${selfDescription}
Job Description: ${jobDescription}`

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(interviewReportSchema),
        }
    })

    let parsed

    try {
        parsed = JSON.parse(response.text)
    } catch (err) {
        console.error("JSON PARSE ERROR:", response.text)
        throw new Error("Invalid JSON from AI")
    }

    return parsed
}

/* -------------------- PDF GENERATOR -------------------- */

async function generatePdfFromHtml(htmlContent) {
    try {
        const browser = await puppeteer.launch({
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
            headless: "new"
        })

        const page = await browser.newPage()

        await page.setContent(htmlContent, {
            waitUntil: "networkidle0",
            timeout: 0
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

    const prompt = `Generate resume for a candidate with the following details:
Resume: ${resume}
Self Description: ${selfDescription}
Job Description: ${jobDescription}

Return JSON with "html" field only.
The resume should be professional, ATS-friendly, and 1-2 pages.`

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(resumePdfSchema),
        }
    })

    let jsonContent

    try {
        jsonContent = JSON.parse(response.text)
    } catch (err) {
        console.error("JSON PARSE ERROR:", response.text)
        throw new Error("Invalid JSON from AI")
    }

    if (!jsonContent.html) {
        throw new Error("HTML content missing from AI")
    }

    const pdfBuffer = await generatePdfFromHtml(jsonContent.html)

    return pdfBuffer
}

module.exports = { generateInterviewReport, generateResumePdf }