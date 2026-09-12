const artifact = /\b(image|picture|photo|illustration|logo|graphic|video|animation|audio|voice|speech|song|music|podcast|code|website|app|file|document|presentation|slide deck|spreadsheet|essay|article|blog post|email)\b/i;
const generationRequest = /^(?:(?:please\s+)?(?:can|could|would|will)\s+you\b|(?:please\s+)?(?:generate|create|make|draw|render|produce|compose|record|write|build|design)\b|i\s+(?:want|need|would like)\s+you\s+to\b)/i;
const offTopic = /^(?:(?:hi|hello|hey|thanks|thank you|test|testing|asdf+|qwerty)[\s!.?]*|(?:tell me|write me)\s+(?:a\s+)?(?:joke|poem|story)|what(?:'s| is)\s+the\s+(?:weather|time)|solve\s+(?:this\s+)?(?:equation|math))/i;
const promptAttack = /\b(?:ignore|disregard|override)\s+(?:all\s+)?(?:previous|prior|system|developer)\s+(?:instructions?|prompts?|rules?)\b|\b(?:reveal|show|repeat|print)\s+(?:the\s+)?(?:system|developer)\s+prompt\b/i;
export function founderInputError(value: string): string | null {
  const text = value.trim();
  if (!text) return "Please answer the current business question.";
  if (/data:(?:image|audio|video)\//i.test(text) || /[A-Za-z0-9+/]{500,}={0,2}/.test(text)) return "Files and encoded media are not accepted. Please answer the current business question in plain text.";
  if (promptAttack.test(text)) return "That instruction is not part of the business discussion. Please answer the current business question.";
  if (generationRequest.test(text) && artifact.test(text)) return "BeforeBuild does not generate images, video, audio, code, or other finished content. Please answer the current business question instead.";
  if (offTopic.test(text)) return "BeforeBuild only helps examine your business idea. Please answer the current business question.";
  return null;
}
