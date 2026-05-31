import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { OpenAI } from "openai";
import { config } from "../config/env.js";
import { MODELS } from "../models/router.js";
import type { UsageEvent } from "./cost.js";

// Tope de tokens de salida por defecto para generación de código (multi-archivo).
// 4096 truncaba salidas grandes -> parseo fallido -> reintento (doble coste).
const DEFAULT_MAX_TOKENS = 8192;

// Callback opcional para reportar el consumo de tokens (seguimiento de coste).
export type OnUsage = (usage: UsageEvent) => void;

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

const deepseekClient = config.deepseek.apiKey
  ? new OpenAI({
      apiKey: config.deepseek.apiKey,
      baseURL: "https://api.deepseek.com",
    })
  : null;

/**
 * Genera contenido de código llamando principalmente a Claude Sonnet,
 * y en caso de error o cuota excedida, realiza un fallback automático a Gemini Flash.
 * 
 * @param prompt Instrucción o contexto del cliente
 * @param systemPrompt Rol e identidad fija del sistema
 * @param preferredModel Modelo preferido ('claude' | 'gemini' | 'deepseek')
 */
export async function generateCode(
  prompt: string,
  systemPrompt: string,
  preferredModel: "claude" | "gemini" | "deepseek" = "claude",
  modelId?: string,
  maxTokens: number = DEFAULT_MAX_TOKENS,
  onUsage?: OnUsage
): Promise<string> {
  // El modelId procede del router (fuente única de verdad). Si no se pasa, usamos el
  // modelo por defecto del tier elegido.
  const claudeModelId = preferredModel === "claude" && modelId ? modelId : MODELS.CLAUDE;
  const geminiModelId = preferredModel === "gemini" && modelId ? modelId : MODELS.GEMINI;

  console.log(`🤖 LLM Request: modelo preferido ${preferredModel.toUpperCase()} (${preferredModel === "claude" ? claudeModelId : geminiModelId}), max_tokens=${maxTokens}`);

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

  // Intentar primero con las APIs oficiales directas de pago (alta calidad)
  if (preferredModel === "deepseek") {
    try {
      console.log("🚀 Usando DeepSeek para edición económica y ultra-rápida.");
      return await callDeepSeek(prompt, systemPrompt, maxTokens, onUsage);
    } catch (err: any) {
      console.warn(`⚠️ DeepSeek falló: ${err.message}. Fallback a Claude...`);
      return await callClaude(prompt, systemPrompt, MODELS.CLAUDE, maxTokens, onUsage);
    }
  } else if (preferredModel === "claude") {
    try {
      // 1. Intentar Claude Directo (Máxima calidad)
      return await callClaude(prompt, systemPrompt, claudeModelId, maxTokens, onUsage);
    } catch (errorClaude: any) {
      console.warn(`⚠️ Claude Directo falló: ${errorClaude.message}. Probando Gemini Directo...`);
      try {
        // 2. Intentar Gemini Directo
        return await callGemini(prompt, systemPrompt, MODELS.GEMINI, maxTokens, onUsage);
      } catch (errorGemini: any) {
        console.warn(`⚠️ Gemini Directo falló: ${errorGemini.message}.`);

        // 3. Fallback a OpenRouter con Modelos Gratuitos como salvavidas
        if (openRouterClient) {
          try {
            console.log(`🔌 Activando salvavidas de OpenRouter (Gemini Pro Free) para tarea compleja...`);
            return await callOpenRouter(prompt, systemPrompt, "google/gemini-2.5-pro:free", onUsage);
          } catch (errorOR: any) {
            throw new Error(`❌ Todos los modelos fallaron. Claude: ${errorClaude.message} | Gemini: ${errorGemini.message} | OpenRouter: ${errorOR.message}`);
          }
        }
        throw new Error(`❌ Modelos principales fallaron y OpenRouter no está configurado. Claude: ${errorClaude.message} | Gemini: ${errorGemini.message}`);
      }
    }
  } else {
    try {
      // 1. Intentar Gemini Directo (Rápido y económico)
      return await callGemini(prompt, systemPrompt, geminiModelId, maxTokens, onUsage);
    } catch (errorGemini: any) {
      console.warn(`⚠️ Gemini Directo falló: ${errorGemini.message}. Probando Claude Directo...`);
      try {
        // 2. Intentar Claude Directo
        return await callClaude(prompt, systemPrompt, MODELS.CLAUDE, maxTokens, onUsage);
      } catch (errorClaude: any) {
        console.warn(`⚠️ Claude Directo falló: ${errorClaude.message}.`);

        // 3. Fallback a OpenRouter con Modelos Gratuitos como salvavidas
        if (openRouterClient) {
          try {
            console.log(`🔌 Activando salvavidas de OpenRouter (Gemini Flash Free) para tarea simple...`);
            return await callOpenRouter(prompt, systemPrompt, "google/gemini-2.5-flash:free", onUsage);
          } catch (errorOR: any) {
            throw new Error(`❌ Todos los modelos fallaron. Gemini: ${errorGemini.message} | Claude: ${errorClaude.message} | OpenRouter: ${errorOR.message}`);
          }
        }
        throw new Error(`❌ Modelos principales fallaron y OpenRouter no está configurado. Gemini: ${errorGemini.message} | Claude: ${errorClaude.message}`);
      }
    }
  }
}

/**
 * Llama al API de Anthropic. El modelId procede del router (MODELS.CLAUDE).
 */
async function callClaude(
  prompt: string,
  systemPrompt: string,
  modelId: string = MODELS.CLAUDE,
  maxTokens: number = DEFAULT_MAX_TOKENS,
  onUsage?: OnUsage
): Promise<string> {
  if (!anthropicClient) {
    throw new Error("Clave API de Anthropic no configurada en las variables de entorno.");
  }

  const response = await anthropicClient.messages.create({
    model: modelId,
    max_tokens: maxTokens,
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

  if (onUsage && response.usage) {
    onUsage({
      model: modelId,
      inputTokens: response.usage.input_tokens ?? 0,
      outputTokens: response.usage.output_tokens ?? 0,
    });
  }

  const textContent = response.content[0];
  if (textContent.type === "text") {
    return textContent.text;
  }

  throw new Error("Claude devolvió un formato de contenido inesperado.");
}

/**
 * Llama al API de Google Generative AI (Gemini 2.5 Flash / Pro)
 */
async function callGemini(
  prompt: string,
  systemPrompt: string,
  modelId: string = MODELS.GEMINI,
  maxTokens: number = DEFAULT_MAX_TOKENS,
  onUsage?: OnUsage
): Promise<string> {
  if (!googleClient) {
    throw new Error("Clave API de Google Gemini no configurada en las variables de entorno.");
  }

  const model = googleClient.getGenerativeModel({
    model: modelId,
    systemInstruction: systemPrompt,
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: 0.2, // Temperatura baja para consistencia de sintaxis de código
    },
  });

  if (onUsage) {
    const usage = result.response.usageMetadata;
    onUsage({
      model: modelId,
      inputTokens: usage?.promptTokenCount ?? 0,
      outputTokens: usage?.candidatesTokenCount ?? 0,
    });
  }

  const text = result.response.text();
  if (text) {
    return text;
  }

  throw new Error("Gemini devolvió un contenido de respuesta vacío.");
}

/**
 * Llama al API de OpenRouter
 */
async function callOpenRouter(prompt: string, systemPrompt: string, modelId: string, onUsage?: OnUsage): Promise<string> {
  if (!openRouterClient) {
    throw new Error("Cliente de OpenRouter no inicializado.");
  }

  const response = await openRouterClient.chat.completions.create({
    model: modelId,
    max_tokens: DEFAULT_MAX_TOKENS,
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

  if (onUsage && response.usage) {
    onUsage({
      model: modelId,
      inputTokens: response.usage.prompt_tokens ?? 0,
      outputTokens: response.usage.completion_tokens ?? 0,
    });
  }

  const text = response.choices[0]?.message?.content;
  if (text) {
    return text;
  }
  
  throw new Error("OpenRouter devolvió un contenido de respuesta vacío.");
}

/**
 * Llama al API de DeepSeek directamente
 */
async function callDeepSeek(prompt: string, systemPrompt: string, maxTokens: number = DEFAULT_MAX_TOKENS, onUsage?: OnUsage): Promise<string> {
  if (!deepseekClient) {
    throw new Error("Cliente de DeepSeek no inicializado (falta DEEPSEEK_API_KEY).");
  }

  const response = await deepseekClient.chat.completions.create({
    model: "deepseek-chat", // Podríamos usar deepseek-coder si es necesario
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
  });

  if (onUsage && response.usage) {
    onUsage({
      model: "deepseek-chat",
      inputTokens: response.usage.prompt_tokens ?? 0,
      outputTokens: response.usage.completion_tokens ?? 0,
    });
  }

  const text = response.choices[0]?.message?.content;
  if (text) {
    return text;
  }
  
  throw new Error("DeepSeek devolvió un contenido de respuesta vacío.");
}
