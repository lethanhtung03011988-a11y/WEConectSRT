import { GoogleGenAI, Type } from "@google/genai";
import { TranscriptionSegment } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // remove "data:*/*;base64," prefix
      const base64Data = result.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const generateTranscription = async (audioFile: File, referenceText: string | null): Promise<TranscriptionSegment[]> => {
  const base64Audio = await fileToBase64(audioFile);
  
  const audioPart = {
    inlineData: {
      mimeType: audioFile.type,
      data: base64Audio,
    },
  };

  let prompt: string;

  if (referenceText) {
    prompt = `
You are an expert audio transcriptionist specializing in Japanese. Your task is to transcribe the provided audio and generate accurate, synchronized subtitles.

**CRITICAL INSTRUCTION:** You have been given a reference text. You MUST use this text to ensure the transcription is as accurate as possible. Align the audio transcription with the provided text, correcting any misheard words, names, or phrases to match the reference text. The final transcription's wording MUST match the reference text.

--- REFERENCE TEXT START ---
${referenceText}
--- REFERENCE TEXT END ---

**OUTPUT FORMAT:**
The output must be a valid JSON array of objects. Each object represents a subtitle segment and must contain:
1. "start": The starting time of the segment in seconds (number).
2. "end": The ending time of the segment in seconds (number).
3. "text": The transcribed text for that segment (string), corrected according to the reference text.

**IMPORTANT EXAMPLE FORMAT:**
[
  { "start": 0.52, "end": 2.88, "text": "京都で、奇跡が起きた。" },
  { "start": 3.1, "end": 5.4, "text": "天皇陛下と雅子さまが姿を現した瞬間、雨が 止まった。" }
]
    `;
  } else {
    prompt = `
      You are an expert audio transcriptionist, particularly for the Japanese language. Your task is to transcribe the provided audio file into text and provide accurate timestamps for each segment.
      The output must be a valid JSON array of objects.
      Each object in the array represents a single subtitle entry and must contain three properties:
      1. "start": The starting time of the segment in seconds (number).
      2. "end": The ending time of the segment in seconds (number).
      3. "text": The transcribed text for that segment (string).

      **IMPORTANT**: You must ensure the following names are transcribed correctly. Pay close attention to these specific names and correct any potential mis-transcriptions in the audio:
      - 秋篠宮様
      - 紀子様
      - 悠仁様
      - 佳子様
      - 眞子様
      - 美智子様
      - 雅子様 (This is the correct kanji for Empress Masako. Do NOT use "正子様".)
      - 愛子様
      - 徳仁天皇
      - 久子様
      - 信子様

      Example format:
      [
        { "start": 0.52, "end": 2.88, "text": "Hello, and welcome to our podcast." },
        { "start": 3.1, "end": 5.4, "text": "Today we'll be discussing the future of AI." }
      ]
    `;
  }

  const textPart = {
    text: prompt,
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: { parts: [audioPart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              start: {
                type: Type.NUMBER,
                description: "The starting time of the segment in seconds."
              },
              end: {
                type: Type.NUMBER,
                description: "The ending time of the segment in seconds."
              },
              text: {
                type: Type.STRING,
                description: "The transcribed text of the segment."
              }
            },
            required: ["start", "end", "text"]
          }
        }
      }
    });

    const jsonString = response.text;
    const transcriptionData = JSON.parse(jsonString);

    if (!Array.isArray(transcriptionData)) {
      throw new Error("API response is not a valid array.");
    }
    
    return transcriptionData as TranscriptionSegment[];

  } catch (error) {
    console.error("Error generating transcription:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to generate transcription: ${error.message}`);
    }
    throw new Error("An unknown error occurred during transcription.");
  }
};