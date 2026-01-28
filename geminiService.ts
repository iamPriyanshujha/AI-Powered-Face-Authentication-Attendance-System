import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { User, VerificationResult, LivenessAction } from '../types';
import { MODEL_NAME } from '../constants';

// --- API KEY CONFIGURATION ---
// We use the provided key directly as requested.
const apiKey =  "AIzaSyAHTROwlfSgjkuCG4GyRldaJZtzQ0CaXEA";

const ai = new GoogleGenAI({ apiKey: apiKey });

// Robust Data URI cleaner
const cleanBase64 = (data: string) => {
    if (!data) return "";
    if (data.includes(',')) {
        return data.split(',')[1];
    }
    return data;
};

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

/**
 * Compresses an image to a specific width and JPEG quality.
 */
export const compressImage = async (base64Str: string, maxWidth = 300, quality = 0.7): Promise<string> => {
    if (!isBrowser) return base64Str;
    if (!base64Str) return "";

    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            // Maintain aspect ratio
            if (width > maxWidth) {
                const ratio = maxWidth / width;
                width = maxWidth;
                height = height * ratio;
            }

            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            if (ctx) {
                 ctx.fillStyle = "#FFFFFF";
                 ctx.fillRect(0,0, canvas.width, canvas.height);
                 ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            }
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => {
            console.warn("Image compression failed, returning original");
            resolve(base64Str);
        };
    });
};

export const validateRegistrationImage = async (image: string): Promise<{valid: boolean, reason?: string}> => {
    if (!apiKey) return { valid: false, reason: "API Key is missing." };
    
    try {
        const compressed = await compressImage(image, 300, 0.7);
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: {
                parts: [
                    { inlineData: { data: cleanBase64(compressed), mimeType: 'image/jpeg' } },
                    { text: "Analyze this image. Does it contain exactly one clear human face suitable for ID verification? Return JSON: { \"valid\": boolean, \"reason\": string }" }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        valid: { type: Type.BOOLEAN },
                        reason: { type: Type.STRING }
                    }
                },
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
                ]
            }
        });

        if (!response.text) throw new Error("No response");
        return JSON.parse(response.text);
    } catch (e: any) {
        console.error("Validation failed", e);
        return { valid: false, reason: `Validation Error: ${e.message || "Unknown error"}` }; 
    }
};

export const verifyFace = async (
  liveImage: string,
  users: User[],
  requiredAction: LivenessAction
): Promise<VerificationResult> => {
  
  if (!apiKey) {
      return {
          match: false,
          confidence: 0,
          livenessConfirmed: false,
          spoofDetected: false,
          reason: "System Error: API Key is missing."
      };
  }

  if (users.length === 0) {
      return {
          match: false,
          confidence: 0,
          livenessConfirmed: false,
          spoofDetected: false,
          reason: "No users registered in the database."
      };
  }

  try {
    // 1. Aggressive Compression Settings
    // Reduces payload size to ~3KB per image to avoid 400 Bad Request
    const COMPRESS_WIDTH = 200;
    const COMPRESS_QUALITY = 0.5;

    // 2. Limit Context Window
    const MAX_USERS_IN_CONTEXT = 40; // Reduced slightly for safety
    const activeUsers = users.slice(0, MAX_USERS_IN_CONTEXT); 

    const compressedLive = await compressImage(liveImage, COMPRESS_WIDTH, COMPRESS_QUALITY);
    
    // Prepare live image part
    const liveImagePart = {
        inlineData: {
            data: cleanBase64(compressedLive),
            mimeType: 'image/jpeg'
        }
    };

    // Prepare user image parts (Parallel compression)
    const userParts = await Promise.all(activeUsers.map(async (u) => {
        const compressed = await compressImage(u.faceImage, COMPRESS_WIDTH, COMPRESS_QUALITY);
        return {
            inlineData: {
                data: cleanBase64(compressed), 
                mimeType: 'image/jpeg'
            }
        };
    }));

    const promptText = `
        Analyze these images for a biometric security check.
        Image 1 (First Image): Live Camera Feed.
        Remaining Images: Registered Users (Index 0 to ${userParts.length - 1}).
        
        Task:
        1. Compare Image 1 with the Registered User images.
        2. Check if Image 1 is performing the action: "${requiredAction}".
        3. Check Image 1 for spoofing (screens, printed photos).

        Return JSON:
        {
           "match": boolean, 
           "matchedUserIndex": integer (Index in the list, -1 if no match),
           "livenessConfirmed": boolean,
           "spoofDetected": boolean,
           "confidence": number (0-1),
           "reason": string
        }
    `;

    const parts = [liveImagePart, ...userParts, { text: promptText }];

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                match: { type: Type.BOOLEAN },
                matchedUserIndex: { type: Type.INTEGER },
                confidence: { type: Type.NUMBER },
                livenessConfirmed: { type: Type.BOOLEAN },
                spoofDetected: { type: Type.BOOLEAN },
                reason: { type: Type.STRING }
            }
        },
        safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
        ]
      }
    });

    if (!response.text) throw new Error("No response text from model");
    
    let result;
    try {
        result = JSON.parse(response.text);
    } catch (e) {
        throw new Error("Invalid JSON response from AI");
    }

    // Map index back to User ID
    let userId: string | undefined;
    if (result.match && result.matchedUserIndex !== undefined && result.matchedUserIndex !== -1) {
        if (activeUsers[result.matchedUserIndex]) {
            userId = activeUsers[result.matchedUserIndex].id;
        }
    }

    return {
      match: result.match,
      userId,
      confidence: result.confidence,
      livenessConfirmed: result.livenessConfirmed,
      spoofDetected: result.spoofDetected,
      reason: result.reason
    };

  } catch (error: any) {
    console.error("Verification Error:", error);
    let errorMsg = error.message || "Unknown Error";
    
    // Friendly error mapping
    if (errorMsg.includes('400')) errorMsg = "Request too large (400). Try clearing some users.";
    else if (errorMsg.includes('403')) errorMsg = "API Key Invalid or Expired (403).";
    else if (errorMsg.includes('503')) errorMsg = "AI Service Unavailable (503). Try again.";
    
    return {
      match: false,
      confidence: 0,
      livenessConfirmed: false,
      spoofDetected: false,
      reason: `Verification Error: ${errorMsg}`
    };
  }
};