// Детектор присутствия чат-виджетов / AI-агентов на странице (по HTML).
// Чистая функция, без сети. Список покрывает топовые в РФ + международные.
// Найден виджет ≠ AI-powered: чат может быть операторским, отчёт обязан это уточнить.

interface Signature {
  name: string
  pattern: RegExp
}

const SIGNATURES: Signature[] = [
  // РФ-операторские/гибридные чаты
  { name: 'Jivo', pattern: /jivo(site|chat)/i },
  { name: 'Bitrix24', pattern: /b24[-.]|bitrix24[-.]|cdn-ru\.bitrix24/i },
  { name: 'RedHelper', pattern: /redhelper/i },
  { name: 'Talk-me', pattern: /talk-?me/i },
  { name: 'Envybox', pattern: /envybox/i },
  { name: 'Callibri', pattern: /callibri/i },
  { name: 'Chatra', pattern: /chatra/i },
  { name: 'CarrotQuest', pattern: /carrot[-_]?quest/i },
  { name: 'Verbox', pattern: /verbox/i },
  { name: 'Mango Office', pattern: /mango-?office|mango-?chat/i },
  { name: 'AmoCRM/Chat', pattern: /amocrm|amochat/i },
  { name: 'UseDesk', pattern: /usedesk/i },
  // Международные
  { name: 'Tawk.to', pattern: /tawk\.to|tawk-?messenger/i },
  { name: 'Crisp', pattern: /crisp\.chat/i },
  { name: 'Intercom', pattern: /intercom\.io|intercom-?cdn/i },
  { name: 'Drift', pattern: /drift\.com/i },
  { name: 'HubSpot Chat', pattern: /hubspot.*chat|chat\.hubspot/i },
  // Квалификационные/лидогенерационные (часто с AI)
  { name: 'Marquiz', pattern: /marquiz/i },
  { name: 'SaleBot', pattern: /salebot/i },
  // Явно AI-движки
  { name: 'OpenAI/ChatGPT', pattern: /openai\.com|chatgpt|chat-?gpt/i },
  { name: 'Dialogflow', pattern: /dialogflow/i },
  // Текстовые маркеры на странице (RU)
  { name: 'AI-ассистент (упоминание)', pattern: /ai[\s\-_]+ассистент|ии[\s\-_]+ассистент|ai[\s\-_]+бот|ии[\s\-_]+бот|чат[\s\-_]?бот/i },
]

export interface AiAgentDetection {
  present: boolean
  detected: string[]
}

export function detectAiAgents(html: string): AiAgentDetection {
  const found = new Set<string>()
  for (const { name, pattern } of SIGNATURES) if (pattern.test(html)) found.add(name)
  return { present: found.size > 0, detected: Array.from(found) }
}
