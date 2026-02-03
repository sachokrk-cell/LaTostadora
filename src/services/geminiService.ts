import { GoogleGenAI } from "@google/genai";
import { AppState } from "../types";

export const getBusinessAdvice = async (data: AppState, query: string): Promise<string> => {
  try {
    // Usamos la API KEY que configuraremos en Vercel
    const genAI = new GoogleGenAI(import.meta.env.VITE_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const summary = {
      totalSales: data.sales.length,
      totalRevenue: data.sales.reduce((acc, s) => acc + s.total, 0),
      topProducts: data.products.slice(0, 5).map(p => p.name),
      clientCount: data.clients.length
    };

    const prompt = `Actúa como consultor de negocios para una cafetería. Datos: ${JSON.stringify(summary)}. Pregunta: ${query}`;
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (e) {
    return "Error al conectar con el Asesor IA. Verifica tu API Key.";
  }
};
