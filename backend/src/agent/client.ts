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

const openAIClient = config.openai.apiKey
  ? new OpenAI({
      apiKey: config.openai.apiKey,
    })
  : null;

// Log de diagnóstico al arrancar: qué proveedores de IA están realmente configurados.
// Si "deepseek: no" y esperas usarlo, falta DEEPSEEK_API_KEY en el entorno del proceso.
console.log(
  `🧩 Proveedores IA configurados → claude: ${!!anthropicClient ? "sí" : "no"}, ` +
  `gemini: ${!!googleClient ? "sí" : "no"}, deepseek: ${!!deepseekClient ? "sí" : "no"}, ` +
  `openai: ${!!openAIClient ? "sí" : "no"}, openrouter: ${!!openRouterClient ? "sí" : "no"}` +
  `${config.llm.primary ? ` | LLM_PRIMARY=${config.llm.primary}` : ""}`
);

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

  // Proveedores disponibles (solo los que tienen cliente configurado).
  const available = {
    claude: !!anthropicClient,
    gemini: !!googleClient,
    deepseek: !!deepseekClient,
    openai: !!openAIClient,
    openrouter: !!openRouterClient,
  };

  // Si LLM_PRIMARY se fijó explícitamente pero ese proveedor no tiene API key,
  // fallamos CLARO en vez de caer en silencio a otros (que pueden estar sin saldo).
  if (config.llm.primary && !available[config.llm.primary]) {
    throw new Error(
      `❌ LLM_PRIMARY="${config.llm.primary}" pero falta su API key ` +
      `(${config.llm.primary === "deepseek" ? "DEEPSEEK_API_KEY" : config.llm.primary === "claude" ? "ANTHROPIC_API_KEY" : "GEMINI_API_KEY"}). ` +
      `Define la clave en el entorno del worker o cambia LLM_PRIMARY.`
    );
  }

  // Proveedor primario: LLM_PRIMARY fuerza el orden (p.ej. solo hay créditos DeepSeek);
  // si no, manda el modelo preferido del router.
  const primary = config.llm.primary || preferredModel;

  // Orden de cascada por defecto tras el primario. Calidad descendente + salvavidas final.
  const baseOrder: ProviderName[] = ["claude", "deepseek", "gemini", "openai", "openrouter"];
  const chain = [primary, ...baseOrder].filter(
    (p, i, arr): p is ProviderName => arr.indexOf(p) === i && available[p as ProviderName]
  );

  if (chain.length === 0) {
    throw new Error("❌ Ningún proveedor de IA está configurado (faltan las API keys).");
  }

  // Modelo de OpenRouter configurable: los ids "...:free" cambian/expiran a menudo (404).
  const openRouterModel = process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat-v3.1:free";

  const callers: Record<ProviderName, () => Promise<string>> = {
    claude: () => callClaude(prompt, systemPrompt, claudeModelId, maxTokens, onUsage),
    gemini: () => callGemini(prompt, systemPrompt, geminiModelId, maxTokens, onUsage),
    deepseek: () => callDeepSeek(prompt, systemPrompt, maxTokens, onUsage),
    openai: () => callOpenAI(prompt, systemPrompt, maxTokens, onUsage),
    openrouter: () => callOpenRouter(prompt, systemPrompt, openRouterModel, onUsage),
  };

  console.log(`🔗 Cascada de modelos: ${chain.join(" → ")}`);

  const errors: string[] = [];
  for (const provider of chain) {
    try {
      return await callers[provider]();
    } catch (err: any) {
      const msg = err?.message || "error desconocido";
      console.warn(`⚠️ ${provider.toUpperCase()} falló: ${msg}. Probando siguiente...`);
      errors.push(`${provider}: ${msg}`);
    }
  }

  throw new Error(`❌ Todos los modelos fallaron en cascada. ${errors.join(" | ")}`);
}

type ProviderName = "claude" | "gemini" | "deepseek" | "openai" | "openrouter";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Chat conversacional con STREAMING de tokens (para el modo Asistente del IDE). A diferencia
 * de generateCode (full-string, multi-archivo), esto emite el texto token a token vía onToken
 * para una experiencia tipo chatbot real. Usa el proveedor primario (LLM_PRIMARY) con cascada
 * de respaldo. Devuelve el texto completo al terminar.
 */
export async function streamChat(
  system: string,
  messages: ChatMessage[],
  onToken: (chunk: string) => void,
  maxTokens: number = 1024,
  onUsage?: OnUsage
): Promise<string> {
  const available = {
    claude: !!anthropicClient,
    gemini: !!googleClient,
    deepseek: !!deepseekClient,
    openai: !!openAIClient,
    openrouter: !!openRouterClient,
  };

  const primary = config.llm.primary || "deepseek";
  const baseOrder: ProviderName[] = ["deepseek", "claude", "gemini", "openai", "openrouter"];
  const chain = [primary, ...baseOrder].filter(
    (p, i, arr): p is ProviderName => arr.indexOf(p) === i && available[p as ProviderName]
  );
  if (chain.length === 0) {
    throw new Error("❌ Ningún proveedor de IA está configurado (faltan las API keys).");
  }

  const openRouterModel = process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat-v3.1:free";
  const oaiModelFor: Partial<Record<ProviderName, string>> = {
    deepseek: config.deepseek.model,
    openai: "gpt-4o",
    openrouter: openRouterModel,
  };
  const oaiClientFor: Partial<Record<ProviderName, OpenAI>> = {
    deepseek: deepseekClient!,
    openai: openAIClient!,
    openrouter: openRouterClient!,
  };

  const errors: string[] = [];
  for (const provider of chain) {
    try {
      // Garantizamos que el consumo se reporte SIEMPRE: si el proveedor no devuelve `usage`
      // en streaming (varía entre APIs), estimamos por longitud para no dejar la acción gratis.
      let usageEmitted = false;
      const wrappedUsage: OnUsage | undefined = onUsage
        ? (u) => { usageEmitted = true; onUsage(u); }
        : undefined;

      let full: string;
      let modelUsed: string;
      if (provider === "claude") {
        modelUsed = MODELS.CLAUDE;
        full = await streamClaude(system, messages, maxTokens, onToken, wrappedUsage);
      } else if (provider === "gemini") {
        modelUsed = MODELS.GEMINI;
        full = await streamGemini(system, messages, maxTokens, onToken, wrappedUsage);
      } else {
        // OpenAI-compatibles (deepseek / openai / openrouter)
        modelUsed = oaiModelFor[provider]!;
        full = await streamOpenAICompatible(oaiClientFor[provider]!, modelUsed, system, messages, maxTokens, onToken, wrappedUsage);
      }

      if (onUsage && !usageEmitted) {
        const inputChars = system.length + messages.reduce((n, m) => n + m.content.length, 0);
        onUsage({ model: modelUsed, inputTokens: Math.ceil(inputChars / 4), outputTokens: Math.ceil(full.length / 4) });
      }
      return full;
    } catch (err: any) {
      const msg = err?.message || "error desconocido";
      console.warn(`⚠️ Streaming ${provider.toUpperCase()} falló: ${msg}. Probando siguiente...`);
      errors.push(`${provider}: ${msg}`);
    }
  }
  throw new Error(`❌ Todos los modelos fallaron en cascada (chat). ${errors.join(" | ")}`);
}

async function streamOpenAICompatible(
  client: OpenAI,
  model: string,
  system: string,
  messages: ChatMessage[],
  maxTokens: number,
  onToken: (c: string) => void,
  onUsage?: OnUsage
): Promise<string> {
  const stream = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    stream: true,
    stream_options: { include_usage: true },
    messages: [{ role: "system", content: system }, ...messages],
  } as any);

  let full = "";
  for await (const chunk of stream as any) {
    const delta = chunk.choices?.[0]?.delta?.content;
    if (delta) {
      full += delta;
      onToken(delta);
    }
    if (chunk.usage && onUsage) {
      onUsage({ model, inputTokens: chunk.usage.prompt_tokens ?? 0, outputTokens: chunk.usage.completion_tokens ?? 0 });
    }
  }
  if (!full) throw new Error("Respuesta de chat vacía.");
  return full;
}

async function streamClaude(
  system: string,
  messages: ChatMessage[],
  maxTokens: number,
  onToken: (c: string) => void,
  onUsage?: OnUsage
): Promise<string> {
  if (!anthropicClient) throw new Error("Cliente de Anthropic no inicializado.");
  const stream = anthropicClient.messages.stream({
    model: MODELS.CLAUDE,
    max_tokens: maxTokens,
    system,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  let full = "";
  stream.on("text", (t: string) => {
    full += t;
    onToken(t);
  });
  const finalMsg = await stream.finalMessage();
  if (onUsage && finalMsg.usage) {
    onUsage({ model: MODELS.CLAUDE, inputTokens: finalMsg.usage.input_tokens ?? 0, outputTokens: finalMsg.usage.output_tokens ?? 0 });
  }
  if (!full) throw new Error("Respuesta de chat vacía.");
  return full;
}

async function streamGemini(
  system: string,
  messages: ChatMessage[],
  maxTokens: number,
  onToken: (c: string) => void,
  onUsage?: OnUsage
): Promise<string> {
  if (!googleClient) throw new Error("Cliente de Gemini no inicializado.");
  const model = googleClient.getGenerativeModel({ model: MODELS.GEMINI, systemInstruction: system });
  const result = await model.generateContentStream({
    contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
    generationConfig: { maxOutputTokens: maxTokens, temperature: 0.4 },
  });

  let full = "";
  for await (const chunk of result.stream) {
    const t = chunk.text();
    if (t) {
      full += t;
      onToken(t);
    }
  }
  const resp = await result.response;
  if (onUsage && resp.usageMetadata) {
    onUsage({ model: MODELS.GEMINI, inputTokens: resp.usageMetadata.promptTokenCount ?? 0, outputTokens: resp.usageMetadata.candidatesTokenCount ?? 0 });
  }
  if (!full) throw new Error("Respuesta de chat vacía.");
  return full;
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
    model: config.deepseek.model, // deepseek-chat por defecto (configurable vía DEEPSEEK_MODEL)
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
  });

  if (onUsage && response.usage) {
    onUsage({
      model: config.deepseek.model,
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

/**
 * Llama al API oficial de OpenAI
 */
async function callOpenAI(prompt: string, systemPrompt: string, maxTokens: number = DEFAULT_MAX_TOKENS, onUsage?: OnUsage): Promise<string> {
  if (!openAIClient) {
    throw new Error("Cliente de OpenAI no inicializado (falta OPENAI_API_KEY).");
  }

  const response = await openAIClient.chat.completions.create({
    model: "gpt-4o",
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
  });

  if (onUsage && response.usage) {
    onUsage({
      model: "gpt-4o",
      inputTokens: response.usage.prompt_tokens ?? 0,
      outputTokens: response.usage.completion_tokens ?? 0,
    });
  }

  const text = response.choices[0]?.message?.content;
  if (text) {
    return text;
  }
  
  throw new Error("OpenAI devolvió un contenido de respuesta vacío.");
}
