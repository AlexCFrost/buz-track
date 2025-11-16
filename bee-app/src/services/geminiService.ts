import { GoogleGenAI } from "@google/genai";
import { GroundingSource } from '../types';

interface GeminiResult {
    text: string;
    sources: GroundingSource[];
}

const getAIGeneratedContent = async (prompt: string, location?: GeolocationCoordinates): Promise<GeminiResult> => {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("NEXT_PUBLIC_GEMINI_API_KEY environment variable not set.");
    }
    const ai = new GoogleGenAI({ apiKey });
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleMaps: {} }],
                ...(location && {
                    toolConfig: {
                        retrievalConfig: {
                            latLng: {
                                latitude: location.latitude,
                                longitude: location.longitude
                            }
                        }
                    }
                })
            },
        });
        
        const text = response.text;
        const sources: GroundingSource[] = [];
        
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (groundingChunks) {
            for (const chunk of groundingChunks) {
                if(chunk.maps) {
                    sources.push({
                        uri: chunk.maps.uri,
                        title: chunk.maps.title
                    });
                }
            }
        }

        return { text, sources };

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error("Failed to get a response from the AI model.");
    }
};

const getCurrentLocation = (): Promise<GeolocationCoordinates> => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocation is not supported by your browser."));
        } else {
            navigator.geolocation.getCurrentPosition(
                (position) => resolve(position.coords),
                (error) => reject(new Error(`Failed to get location: ${error.message}`))
            );
        }
    });
};


export const askGeminiWithMaps = async (prompt: string): Promise<GeminiResult> => {
    try {
        const location = await getCurrentLocation();
        return await getAIGeneratedContent(prompt, location);
    } catch (locationError: any) {
        console.warn(`Could not get location: ${locationError.message}. Proceeding without it.`);
        // Fallback to making the call without location data
        return await getAIGeneratedContent(prompt);
    }
};
