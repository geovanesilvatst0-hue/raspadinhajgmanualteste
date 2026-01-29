
import { GoogleGenAI } from "@google/genai";

export async function generatePrizeMessage(prizeName: string, iswinning: boolean): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = iswinning 
    ? `Crie uma mensagem curta, animada e criativa (máximo 100 caracteres) em português para um cliente que acabou de ganhar o seguinte prêmio: "${prizeName}". Use emojis!`
    : `Crie uma mensagem curta, motivadora e divertida (máximo 100 caracteres) em português para um cliente que não ganhou nada na raspadinha hoje. Incentive-o a voltar amanhã. Use emojis!`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || (iswinning ? "Parabéns pelo prêmio!" : "Boa sorte na próxima!");
  } catch (error) {
    console.error("Gemini Error:", error);
    return iswinning ? "Você é fera! Aproveite seu prêmio." : "Não desista, a sorte está chegando!";
  }
}
