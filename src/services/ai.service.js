const { GoogleGenAI } = require("@google/genai")
const { z } = require("zod")
const { zodToJsonSchema } = require("zod-to-json-schema")
const { PDFDocument, StandardFonts } = require('pdf-lib')

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
})

/* ---------------- SAFE JSON PARSER ---------------- */

function safeJsonParse(text) {
    try {
        let cleaned = text.trim()

        if (cleaned.startsWith("```")) {
            cleaned = cleaned.replace(/```json|```/g, "").trim()
        }

        return JSON.parse(cleaned)

    } catch (err) {
        console.error("JSON ERROR:", text)
        throw new Error("Invalid JSON from AI")
    }
}

/* ---------------- ORIGINAL SCHEMA (UNCHANGED) ---------------- */

const interviewReportSchema = z.object({
    matchScore: z.number().describe("A score between 0 and 100 indicating how well the candidate's profile matches the job describe"),
    technicalQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Technical questions that can be asked in the interview along with their intention and how to answer them"),
    behavioralQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Behavioral questions that can be asked in the interview along with their intention and how to answer them"),
    skillGaps: z.array(z.object({
        skill: z.string().describe("The skill which the candidate is lacking"),
        severity: z.enum([ "low", "medium", "high" ]).describe("The severity of this skill gap, i.e. how important is this skill for the job and how much it can impact the candidate's chances")
    })).describe("List of skill gaps in the candidate's profile along with their severity"),
    preparationPlan: z.array(z.object({
        day: z.number().describe("The day number in the preparation plan, starting from 1"),
        focus: z.string().describe("The main focus of this day in the preparation plan, e.g. data structures, system design, mock interviews etc."),
        tasks: z.array(z.string()).describe("List of tasks to be done on this day to follow the preparation plan")
    })).describe("A day-wise preparation plan"),
    title: z.string().describe("The title of the job for which the interview report is generated"),
})

/* ---------------- INTERVIEW REPORT ---------------- */

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {

    const prompt = `Generate an interview report JSON.

Resume: ${resume}
Self Description: ${selfDescription}
Job Description: ${jobDescription}`

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview", // tera original hi rakha
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(interviewReportSchema),
        }
    })

    return safeJsonParse(response.text)
}

/* ---------------- PDF GENERATOR ---------------- */

async function generatePdfFromHtml(htmlContent) {
    try {

        // 🔥 FIX
        if (typeof htmlContent !== "string") {
            htmlContent = JSON.stringify(htmlContent)
        }

        const pdfDoc = await PDFDocument.create()
        const page = pdfDoc.addPage()

        const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

        const { width, height } = page.getSize()

        const text = htmlContent
            .replace(/<[^>]*>/g, '')
            .replace(/\s+/g, ' ')

        let y = height - 40

        text.match(/.{1,90}/g).forEach(line => {
            page.drawText(line, {
                x: 40,
                y: y,
                size: 12,
                font: font,
            })
            y -= 16
        })

        const pdfBytes = await pdfDoc.save()
       return Buffer.from(pdfBytes)

    } catch (err) {
        console.error("PDF ERROR:", err)
        throw err
    }
}
/* ---------------- RESUME PDF ---------------- */

async function generateResumePdf({ resume, selfDescription, jobDescription }) {

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {
                font-family: Arial, sans-serif;
                padding: 40px;
                color: black;
                line-height: 1.6;
            }
            h1 { font-size: 26px; }
            h2 {
                margin-top: 20px;
                border-bottom: 1px solid #ccc;
            }
            p {
                font-size: 14px;
                white-space: pre-wrap;
            }
        </style>
    </head>

    <body>

        <h1>Generated Resume</h1>

        <h2>Self Description</h2>
        <p>${selfDescription || "No data"}</p>

        <h2>Resume Content</h2>
        <p>${resume || "No resume data"}</p>

        <h2>Target Job</h2>
        <p>${jobDescription || "No job description"}</p>

    </body>
    </html>
    `

    console.log("HTML LENGTH:", htmlContent.length)

    const pdfBuffer = await generatePdfFromHtml({
        resume,
    selfDescription,
    jobDescription
    })

    return pdfBuffer
}
module.exports = { generateInterviewReport, generateResumePdf }