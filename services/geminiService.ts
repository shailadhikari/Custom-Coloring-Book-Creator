
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { ImageSize } from "../types";

// Note: process.env.API_KEY is pre-configured
export const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates 5 distinct coloring page prompts based on a theme.
 */
export async function generatePrompts(theme: string): Promise<string[]> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate 5 unique, short descriptions for coloring book pages based on the theme: "${theme}". 
    Each description should be a single scene.
    Keep descriptions simple for children. 
    Return them as a JSON array of strings.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Failed to parse prompts", e);
    return [theme, theme, theme, theme, theme];
  }
}

/**
 * Generates a single coloring page image.
 */
export async function generateColoringImage(prompt: string, size: ImageSize): Promise<string> {
  // Use gemini-2.5-flash-image for standard size (1K) to avoid mandatory manual key selection
  // Use gemini-3-pro-image-preview for high-res (2K, 4K)
  const isHighRes = size === '2K' || size === '4K';
  const model = isHighRes ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const enhancedPrompt = `A simple black and white coloring book page for a child. 
  Subject: ${prompt}. 
  Style: Bold thick black outlines, clear white background, no shading, minimal detail, high contrast. 
  Perfect for markers or crayons.`;

  const response = await ai.models.generateContent({
    model: model,
    contents: {
      parts: [{ text: enhancedPrompt }]
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
        ...(isHighRes ? { imageSize: size } : {})
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image data returned from model");
}

/**
 * Simple chat helper using Gemini 3 Flash
 */
export async function getChatResponse(message: string, history: any[]) {
  const ai = getAI();
  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: 'You are a helpful, creative assistant for a coloring book app. You help kids and parents come up with fun themes and ideas for coloring pages.'
    }
  });

  const response = await chat.sendMessage({ message });
  return response.text;
}
