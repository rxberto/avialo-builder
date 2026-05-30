import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { OpenAI } from "openai";
import { config } from "../config/env.js";

// Inicialización segura de los SDKs oficiales
const anthropicClient = config.anthropic.apiKey 
  ? new Anthropic({ apiKey: config.anthropic.apiKey }) 
  : null;

const googleClient = config.gemini.apiKey 
  ? new GoogleGenerativeAI(config.gemini.apiKey) 
  : null;

const openRouterClient = config.openrouter.apiKey
  ? new OpenAI({
      apiKey: config.openrouter.apiKey,
      baseURL: "https://openrouter.ai/api/v1",
    })
  : null;

/**
 * Genera contenido de código llamando principalmente a Claude Sonnet,
 * y en caso de error o cuota excedida, realiza un fallback automático a Gemini Flash.
 * 
 * @param prompt Instrucción o contexto del cliente
 * @param systemPrompt Rol e identidad fija del sistema
 * @param preferredModel Modelo preferido ('claude' | 'gemini')
 */
export async function generateCode(
  prompt: string,
  systemPrompt: string,
  preferredModel: "claude" | "gemini" = "claude"
): Promise<string> {
  console.log(`🤖 LLM Request: Iniciando generación con modelo preferido: ${preferredModel.toUpperCase()}`);

  if (process.env.MOCK_LLM === "true") {
    console.log("🤖 [MOCK LLM ACTIVE]: Simulando respuesta de la IA...");
    if (prompt.includes("El build de la iteración anterior ha fallado")) {
      return `
      [ARCHIVO: src/app/layout.tsx]
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { CookieBanner } from "./CookieBanner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Fontaneria Garcia | Fontaneria en Madrid",
  description: "Servicios profesionales de fontanería en Madrid. Instalaciones y reparaciones 24h.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full scroll-smooth">
      <body className={inter.className}>
        <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
            <Link href="/" className="text-xl font-bold tracking-tight">
              Fontanería García
            </Link>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <CookieBanner />
      </body>
    </html>
  );
}
      `;
    } else {
      return `
      [ARCHIVO: src/app/layout.tsx]
import type { Metadata } from "next";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {children}
      </body>
    </html>
  ) // ERROR DE SINTAXIS INTENCIONADO (Falta llave)
      `;
    }
  }

  // Si OpenRouter está configurado en las variables de entorno, canalizar la petición
  if (openRouterClient) {
    try {
      console.log(`🔌 OpenRouter detectado. Canalizando petición de tipo: ${preferredModel.toUpperCase()}`);
      const modelId = preferredModel === "claude" 
        ? "anthropic/claude-3.5-sonnet" 
        : "google/gemini-2.5-flash";
      return await callOpenRouter(prompt, systemPrompt, modelId);
    } catch (error: any) {
      console.warn(`⚠️ OpenRouter falló o dio error: ${error.message || error}. Activando fallback a clientes oficiales directos...`);
    }
  }

  if (preferredModel === "claude") {
    try {
      return await callClaude(prompt, systemPrompt);
    } catch (error: any) {
      console.warn(`⚠️ Claude falló o no está configurado: ${error.message || error}. Activando fallback a Gemini...`);
      return await callGemini(prompt, systemPrompt);
    }
  } else {
    try {
      return await callGemini(prompt, systemPrompt);
    } catch (error: any) {
      console.warn(`⚠️ Gemini falló o no está configurado: ${error.message || error}. Activando fallback a Claude...`);
      return await callClaude(prompt, systemPrompt);
    }
  }
}

/**
 * Llama al API de Anthropic (Claude 3.5 Sonnet)
 */
async function callClaude(prompt: string, systemPrompt: string): Promise<string> {
  if (!anthropicClient) {
    throw new Error("Clave API de Anthropic no configurada en las variables de entorno.");
  }

  // Claude 3.5 Sonnet v2 es ideal para programación compleja
  const response = await anthropicClient.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 4096,
    system: [
      {
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" } as any,
      }
    ],
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const textContent = response.content[0];
  if (textContent.type === "text") {
    return textContent.text;
  }
  
  throw new Error("Claude devolvió un formato de contenido inesperado.");
}

/**
 * Llama al API de Google Generative AI (Gemini 2.5 Flash / Pro)
 */
async function callGemini(prompt: string, systemPrompt: string): Promise<string> {
  if (!googleClient) {
    throw new Error("Clave API de Google Gemini no configurada en las variables de entorno.");
  }

  // Gemini 2.5 Flash ofrece velocidad y excelente razonamiento de código de respaldo
  const model = googleClient.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: systemPrompt,
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: 4096,
      temperature: 0.2, // Temperatura baja para consistencia de sintaxis de código
    },
  });

  const text = result.response.text();
  if (text) {
    return text;
  }

  throw new Error("Gemini devolvió un contenido de respuesta vacío.");
}

/**
 * Llama al API de OpenRouter
 */
async function callOpenRouter(prompt: string, systemPrompt: string, modelId: string): Promise<string> {
  if (!openRouterClient) {
    throw new Error("Cliente de OpenRouter no inicializado.");
  }

  const response = await openRouterClient.chat.completions.create({
    model: modelId,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    extraHeaders: {
      "HTTP-Referer": "https://avialo.app",
      "X-Title": "Avialo Builder",
    }
  } as any);

  const text = response.choices[0]?.message?.content;
  if (text) {
    return text;
  }
  
  throw new Error("OpenRouter devolvió un contenido de respuesta vacío.");
}
